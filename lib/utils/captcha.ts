/**
 * Simple CAPTCHA-like Protection
 * Provides basic human verification without external services
 */

/**
 * Generate a simple math challenge
 */
export function generateMathChallenge(): { question: string; answer: number; token: string } {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operations = ['+', '-', '*'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let answer: number;
    let question: string;
    
    switch (operation) {
        case '+':
            answer = num1 + num2;
            question = `${num1} + ${num2}`;
            break;
        case '-':
            // Ensure positive result
            const larger = Math.max(num1, num2);
            const smaller = Math.min(num1, num2);
            answer = larger - smaller;
            question = `${larger} - ${smaller}`;
            break;
        case '*':
            // Use smaller numbers for multiplication
            const smallNum1 = Math.floor(Math.random() * 5) + 1;
            const smallNum2 = Math.floor(Math.random() * 5) + 1;
            answer = smallNum1 * smallNum2;
            question = `${smallNum1} × ${smallNum2}`;
            break;
        default:
            answer = num1 + num2;
            question = `${num1} + ${num2}`;
    }
    
    // Create a simple token (in production, use proper encryption)
    const token = Buffer.from(`${answer}:${Date.now()}`).toString('base64');
    
    return { question, answer, token };
}

/**
 * Verify math challenge answer
 */
export function verifyMathChallenge(token: string, userAnswer: number): boolean {
    try {
        const decoded = Buffer.from(token, 'base64').toString();
        const [correctAnswer, timestamp] = decoded.split(':');
        
        // Check if token is expired (5 minutes)
        const tokenAge = Date.now() - parseInt(timestamp);
        if (tokenAge > 5 * 60 * 1000) {
            return false;
        }
        
        return parseInt(correctAnswer) === userAnswer;
    } catch {
        return false;
    }
}

/**
 * Generate a simple text-based CAPTCHA
 */
export function generateTextChallenge(): { question: string; answer: string; token: string } {
    const challenges = [
        { question: "What color is the sky on a clear day?", answer: "blue" },
        { question: "How many days are in a week?", answer: "7" },
        { question: "What is the opposite of 'hot'?", answer: "cold" },
        { question: "What animal says 'meow'?", answer: "cat" },
        { question: "What do you use to write on paper?", answer: "pen" },
        { question: "What is 2 + 2?", answer: "4" },
        { question: "What comes after Monday?", answer: "tuesday" },
        { question: "What is the first letter of the alphabet?", answer: "a" }
    ];
    
    const challenge = challenges[Math.floor(Math.random() * challenges.length)];
    const token = Buffer.from(`${challenge.answer.toLowerCase()}:${Date.now()}`).toString('base64');
    
    return {
        question: challenge.question,
        answer: challenge.answer,
        token
    };
}

/**
 * Verify text challenge answer
 */
export function verifyTextChallenge(token: string, userAnswer: string): boolean {
    try {
        const decoded = Buffer.from(token, 'base64').toString();
        const [correctAnswer, timestamp] = decoded.split(':');
        
        // Check if token is expired (5 minutes)
        const tokenAge = Date.now() - parseInt(timestamp);
        if (tokenAge > 5 * 60 * 1000) {
            return false;
        }
        
        return correctAnswer.toLowerCase() === userAnswer.toLowerCase().trim();
    } catch {
        return false;
    }
}

/**
 * Honeypot field generator
 * Creates a hidden field that bots might fill but humans won't see
 */
export function generateHoneypot(): { fieldName: string; expectedValue: string } {
    const fieldNames = [
        'website', 'url', 'homepage', 'link', 'address', 'phone_number',
        'fax', 'company', 'organization', 'title', 'position'
    ];
    
    const fieldName = fieldNames[Math.floor(Math.random() * fieldNames.length)];
    
    return {
        fieldName,
        expectedValue: '' // Should always be empty
    };
}

/**
 * Verify honeypot field
 */
export function verifyHoneypot(fieldName: string, value: any): boolean {
    // Honeypot field should be empty
    return !value || value === '';
}

/**
 * Time-based challenge (measure form fill time)
 */
export function generateTimeChallenge(): string {
    const startTime = Date.now();
    return Buffer.from(startTime.toString()).toString('base64');
}

/**
 * Verify time challenge (form should take reasonable time to fill)
 */
export function verifyTimeChallenge(token: string, minSeconds: number = 3, maxSeconds: number = 300): boolean {
    try {
        const startTime = parseInt(Buffer.from(token, 'base64').toString());
        const fillTime = (Date.now() - startTime) / 1000;
        
        // Form should take between minSeconds and maxSeconds to fill
        return fillTime >= minSeconds && fillTime <= maxSeconds;
    } catch {
        return false;
    }
}