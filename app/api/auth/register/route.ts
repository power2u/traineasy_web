import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { rateLimit, RATE_LIMITS, createRateLimitHeaders } from "@/lib/utils/rate-limit";
import { detectBot, createBotBlockResponse } from "@/lib/utils/bot-detection";

export async function POST(req: Request) {
    try {
        // 1. Bot Detection - Block only high-confidence bots
        const botDetection = detectBot(req);
        if (botDetection.isBot && botDetection.confidence > 85) {
            console.warn(`[Registration] High-confidence bot registration blocked: ${botDetection.reason}`);
            return createBotBlockResponse();
        } else if (botDetection.isBot) {
            // Log medium-confidence detections but allow them through
            console.log(`[Registration] Potential bot detected (confidence: ${botDetection.confidence}%): ${botDetection.reason}`);
        }

        // 2. Apply rate limiting
        const rateLimitResult = rateLimit(req, RATE_LIMITS.REGISTER);
        
        if (!rateLimitResult.allowed) {
            const headers = createRateLimitHeaders(
                rateLimitResult.remaining,
                rateLimitResult.resetTime,
                RATE_LIMITS.REGISTER.limit
            );
            
            return NextResponse.json(
                { error: "Too many registration attempts. Please try again later." },
                { status: 429, headers }
            );
        }

        // 3. Check if registration is enabled
        if (process.env.DISABLE_REGISTRATION === 'true') {
            return NextResponse.json(
                { error: "Registration is currently disabled" },
                { status: 403 }
            );
        }
        // 4. Enhanced input validation
        const { 
            email, 
            password, 
            full_name, 
            mathAnswer, 
            mathToken, 
            timeToken,
            ...honeypotFields 
        } = await req.json();

        // CAPTCHA validation
        if (process.env.ENABLE_CAPTCHA !== 'false') {
            const { verifyMathChallenge, verifyTimeChallenge, verifyHoneypot } = await import('@/lib/utils/captcha');
            
            // Verify math challenge
            if (!mathAnswer || !mathToken || !verifyMathChallenge(mathToken, parseInt(mathAnswer))) {
                return NextResponse.json({ error: "Invalid security challenge answer" }, { status: 400 });
            }
            
            // Verify time challenge (form should take reasonable time to fill)
            if (!timeToken || !verifyTimeChallenge(timeToken, 5, 600)) { // 5 seconds to 10 minutes
                return NextResponse.json({ error: "Form submitted too quickly or too slowly" }, { status: 400 });
            }
            
            // Verify honeypot fields (should be empty)
            for (const [key, value] of Object.entries(honeypotFields)) {
                if (value && value !== '') {
                    console.warn(`[Security] Honeypot field filled: ${key} = ${value}`);
                    return NextResponse.json({ error: "Invalid form submission" }, { status: 400 });
                }
            }
        }

        // Input validation
        if (!email || !password || !full_name) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }

        // Email validation - more strict
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }

        // Block disposable email domains
        const disposableDomains = [
            '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 'mailinator.com',
            'yopmail.com', 'temp-mail.org', 'throwaway.email', 'getnada.com'
        ];
        const emailDomain = email.split('@')[1]?.toLowerCase();
        if (disposableDomains.includes(emailDomain)) {
            return NextResponse.json({ error: "Disposable email addresses are not allowed" }, { status: 400 });
        }

        // Password validation - stronger requirements
        if (password.length < 8) {
            return NextResponse.json({ error: "Password must be at least 8 characters long" }, { status: 400 });
        }

        // Check password complexity
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
            return NextResponse.json({ 
                error: "Password must contain at least one uppercase letter, one lowercase letter, and one number" 
            }, { status: 400 });
        }

        // Name validation - prevent suspicious names
        if (full_name.length < 2 || full_name.length > 100) {
            return NextResponse.json({ error: "Name must be between 2 and 100 characters" }, { status: 400 });
        }

        // Block suspicious names
        const suspiciousPatterns = [
            /admin/i, /test/i, /bot/i, /crawler/i, /script/i, /hack/i,
            /null/i, /undefined/i, /anonymous/i, /guest/i, /temp/i
        ];
        
        if (suspiciousPatterns.some(pattern => pattern.test(full_name))) {
            return NextResponse.json({ error: "Invalid name provided" }, { status: 400 });
        }

        // Prevent admin role creation through registration
        if (email.toLowerCase().includes('admin') || full_name.toLowerCase().includes('admin')) {
            console.warn(`[Security] Suspicious admin registration attempt: ${email}`);
            return NextResponse.json({ error: "Invalid registration data" }, { status: 400 });
        }

        // Check if user exists
        const existing = await prisma.userPreference.findUnique({
            where: { email: email.toLowerCase() },
            select: { id: true, emailVerified: true }
        });

        if (existing) {
            // Don't reveal if email exists for security
            return NextResponse.json({ 
                success: true,
                message: "If this email is not already registered, you will receive a verification email shortly."
            });
        }

        // Use stronger bcrypt rounds
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user in user_preferences with strict defaults
        const newUser = await prisma.userPreference.create({
            data: {
                email: email.toLowerCase(), // Normalize email
                passwordHash: hashedPassword,
                fullName: full_name.trim(),
                emailVerified: false, // Require email verification
                role: 'user', // NEVER allow admin role through registration
                // Default settings
                notificationsEnabled: true,
                mealRemindersEnabled: true,
                waterRemindersEnabled: true,
                weightRemindersEnabled: true,
                preferredUnit: 'kg',
                goalWeightUnit: 'kg',
                dailyWaterTarget: 2000,
                glassSizeMl: 250,
                theme: 'system',
                language: 'en'
            }
        });

        // Log registration for security monitoring
        console.log(`[Registration] New user registered: ${email} (ID: ${newUser.id})`);

        // Send email verification
        const { sendEmailVerification } = await import('@/app/actions/email-verification');
        const verificationResult = await sendEmailVerification(newUser.id, email);
        
        if (!verificationResult.success) {
            console.warn('[Registration] Failed to send verification email:', verificationResult.error);
            // Don't fail registration if email fails, but log it
        }

        return NextResponse.json({ 
            success: true, 
            userId: newUser.id,
            message: "Account created successfully! Please check your email to verify your account before signing in."
        });
    } catch (error: any) {
        console.error("Signup exception:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
