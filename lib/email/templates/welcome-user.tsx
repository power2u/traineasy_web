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
            <Preview>Welcome to TrainEasy! 🚀</Preview>
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
                            Your account has been successfully created. We're excited to have you on board!
                        </Text>

                        <Section style={credentialsSection}>
                            <Text style={subheading}>Your Login Details:</Text>
                            <div style={credentialBox}>
                                <Text style={credentialText}>
                                    <strong>Email:</strong> {userEmail}
                                </Text>
                                {password && (
                                    <Text style={credentialText}>
                                        <strong>Password:</strong> {password}
                                    </Text>
                                )}
                            </div>
                        </Section>

                        <Text style={text}>
                            Click the button below to log in and get started:
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
                            <Text style={noticeText}>
                                🔒 <strong>Security Tip:</strong> We recommend changing your password after your first login.
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
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
    maxWidth: '600px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
};

const logoSection = {
    padding: '32px 20px',
    textAlign: 'center' as const,
    borderBottom: '1px solid #e6e6e6',
};

const logo = {
    margin: '0 auto',
    borderRadius: '12px',
};

const heading = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    margin: '12px 0 0 0',
};

const contentSection = {
    padding: '32px 40px',
};

const title = {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    margin: '0 0 24px 0',
};

const subheading = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#404040',
    margin: '0 0 12px 0',
};

const text = {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#525252',
    margin: '16px 0',
};

const credentialsSection = {
    margin: '24px 0',
};

const credentialBox = {
    backgroundColor: '#f1f5f9',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
};

const credentialText = {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#334155',
    margin: '4px 0',
    fontFamily: 'monospace',
};

const buttonSection = {
    textAlign: 'center' as const,
    margin: '32px 0',
};

const button = {
    backgroundColor: '#2563eb',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 40px',
    cursor: 'pointer',
    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
};

const linkText = {
    fontSize: '14px',
    lineHeight: '20px',
    color: '#737373',
    margin: '8px 0',
    wordBreak: 'break-all' as const,
};

const link = {
    color: '#2563eb',
    textDecoration: 'underline',
};

const hr = {
    borderColor: '#e6e6e6',
    margin: '32px 0',
};

const noticeSection = {
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    padding: '16px',
    margin: '24px 0 0',
    border: '1px solid #bfdbfe',
};

const noticeText = {
    fontSize: '14px',
    lineHeight: '20px',
    color: '#1e40af',
    margin: '0',
};

const footer = {
    padding: '0 40px',
    borderTop: '1px solid #e6e6e6',
    paddingTop: '24px',
    textAlign: 'center' as const,
};

const footerText = {
    fontSize: '12px',
    lineHeight: '16px',
    color: '#a3a3a3',
    margin: '8px 0',
};

const footerLink = {
    color: '#2563eb',
    textDecoration: 'underline',
};
