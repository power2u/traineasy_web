import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
    Hr,
} from '@react-email/components';
import * as React from 'react';

interface WelcomeEmailProps {
    userEmail: string;
    userName: string;
    password?: string;
    loginUrl: string;
    baseUrl: string;
    supportEmail?: string;
}

export const WelcomeEmail = ({
    userEmail,
    userName,
    password,
    loginUrl,
    baseUrl,
    supportEmail = 'teamsouravfitness@gmail.com',
}: WelcomeEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Welcome to TrainEasy! 🚀 Your account is ready.</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Logo Section */}
                    <Section style={logoSection}>
                        <Img
                            src={`${baseUrl}/logo.png`}
                            width="64"
                            height="64"
                            alt="TrainEasy"
                            style={logo}
                        />
                        <Heading style={heading}>TrainEasy</Heading>
                    </Section>

                    {/* Main Content */}
                    <Section style={contentSection}>
                        <Heading style={title}>Welcome, {userName}! 👋</Heading>
                        <Text style={text}>
                            Your account has been successfully created. We're excited to help you achieve your fitness goals!
                        </Text>

                        <Section style={credentialsSection}>
                            <Text style={subheading}>Your Login Credentials</Text>
                            <div style={credentialBox}>
                                <div style={credentialRow}>
                                    <Text style={credentialLabel}>Email:</Text>
                                    <Text style={credentialValue}>{userEmail}</Text>
                                </div>
                                {password && (
                                    <>
                                        <Hr style={credentialDivider} />
                                        <div style={credentialRow}>
                                            <Text style={credentialLabel}>Temporary Password:</Text>
                                            <Text style={credentialValue}>{password}</Text>
                                        </div>
                                    </>
                                )}
                            </div>
                            <Text style={captionText}>
                                Please copy your password to log in. You can allow your browser to save it, or change it after logging in.
                            </Text>
                        </Section>

                        <Text style={text}>
                            Ready to get started? Click the button below to access your dashboard:
                        </Text>

                        {/* CTA Button */}
                        <Section style={buttonSection}>
                            <Button style={button} href={loginUrl}>
                                Log In to Dashboard
                            </Button>
                        </Section>

                        <Text style={text}>
                            Or copy and paste this link into your browser:
                        </Text>
                        <Text style={linkText}>
                            <Link href={loginUrl} style={link}>
                                {loginUrl}
                            </Link>
                        </Text>

                        <Hr style={hr} />

                        {/* Security Notice */}
                        <Section style={noticeSection}>
                            <Text style={noticeTitle}>🔒 Security Check</Text>
                            <Text style={noticeText}>
                                For your security, we recommend <strong>changing your password</strong> immediately after your first login. You can do this from your Profile settings.
                            </Text>
                        </Section>
                    </Section>

                    {/* Footer */}
                    <Section style={footer}>
                        <Text style={footerText}>
                            Need help? Contact us at{' '}
                            <Link href={`mailto:${supportEmail}`} style={footerLink}>
                                {supportEmail}
                            </Link>
                        </Text>
                        <Text style={footerText}>
                            © {new Date().getFullYear()} TrainEasy. All rights reserved.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default WelcomeEmail;

// Styles
const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
    padding: '12px',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '0',
    marginBottom: '48px',
    maxWidth: '580px',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e2e8f0',
    overflow: 'hidden' as const,
};

const logoSection = {
    padding: '32px 20px',
    textAlign: 'center' as const,
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #f1f5f9',
};

const logo = {
    margin: '0 auto',
    borderRadius: '12px',
    display: 'block',
};

const heading = {
    fontSize: '24px',
    fontWeight: '800',
    color: '#0f172a',
    margin: '16px 0 0 0',
    letterSpacing: '-0.5px',
};

const contentSection = {
    padding: '40px 48px',
};

const title = {
    fontSize: '26px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 20px 0',
    letterSpacing: '-0.5px',
};

const subheading = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#334155',
    margin: '0 0 12px 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
};

const text = {
    fontSize: '16px',
    lineHeight: '26px',
    color: '#475569',
    margin: '16px 0',
};

const credentialsSection = {
    margin: '32px 0',
};

const credentialBox = {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden' as const,
};

const credentialRow = {
    padding: '16px 20px',
};

const credentialDivider = {
    margin: '0',
    borderColor: '#e2e8f0',
    borderWidth: '1px',
};

const credentialLabel = {
    fontSize: '13px',
    fontWeight: '600',
    color: '#64748b',
    margin: '0 0 4px 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
};

const credentialValue = {
    fontSize: '18px',
    fontFamily: 'SFMono-Regular,Consolas,"Liberation Mono",Menlo,monospace',
    fontWeight: '600',
    color: '#0f172a',
    margin: '0',
    wordBreak: 'break-all' as const,
};

const captionText = {
    fontSize: '13px',
    lineHeight: '20px',
    color: '#94a3b8',
    marginTop: '12px',
    textAlign: 'center' as const,
};

const buttonSection = {
    textAlign: 'center' as const,
    margin: '32px 0',
};

const button = {
    backgroundColor: '#2563eb',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '16px 48px',
    cursor: 'pointer',
    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -1px rgba(37, 99, 235, 0.1)',
};

const linkText = {
    fontSize: '14px',
    lineHeight: '22px',
    color: '#64748b',
    margin: '8px 0',
    wordBreak: 'break-all' as const,
};

const link = {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: '500',
};

const hr = {
    borderColor: '#e2e8f0',
    margin: '32px 0',
};

const noticeSection = {
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #dbeafe',
};

const noticeTitle = {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1e40af',
    margin: '0 0 8px 0',
};

const noticeText = {
    fontSize: '14px',
    lineHeight: '22px',
    color: '#1e3a8a',
    margin: '0',
};

const footer = {
    backgroundColor: '#f8fafc',
    padding: '32px 20px',
    borderTop: '1px solid #f1f5f9',
    textAlign: 'center' as const,
};

const footerText = {
    fontSize: '13px',
    lineHeight: '20px',
    color: '#94a3b8',
    margin: '8px 0',
};

const footerLink = {
    color: '#64748b',
    textDecoration: 'underline',
};
