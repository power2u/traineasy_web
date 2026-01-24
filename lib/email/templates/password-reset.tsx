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
} from '@react-email/components';
import * as React from 'react';

interface PasswordResetEmailProps {
    resetLink: string;
    userEmail: string;
    expirationHours?: number;
    baseUrl: string;
    supportEmail?: string;
}

export const PasswordResetEmail = ({
    resetLink,
    userEmail,
    expirationHours = 24,
    baseUrl,
    supportEmail = 'teamsouravfitness@gmail.com',
}: PasswordResetEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Reset your TrainEasy password</Preview>
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
                        <Heading style={title}>Reset Your Password</Heading>
                        <Text style={text}>
                            Hi there,
                        </Text>
                        <Text style={text}>
                            We received a request to reset the password for your TrainEasy account
                            associated with <strong>{userEmail}</strong>.
                        </Text>
                        <Text style={text}>
                            Click the button below to create a new password:
                        </Text>

                        {/* CTA Button */}
                        <Section style={buttonSection}>
                            <Button style={button} href={resetLink}>
                                Reset Password
                            </Button>
                        </Section>

                        <Text style={text}>
                            Or copy and paste this link into your browser:
                        </Text>
                        <Text style={linkText}>
                            <Link href={resetLink} style={link}>
                                {resetLink}
                            </Link>
                        </Text>

                        {/* Security Notice */}
                        <Section style={noticeSection}>
                            <Text style={noticeText}>
                                ⏱️ This link will expire in <strong>{expirationHours} hours</strong>.
                            </Text>
                            <Text style={noticeText}>
                                🔒 If you didn't request this password reset, you can safely ignore this
                                email. Your password will remain unchanged.
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

export default PasswordResetEmail;

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

const text = {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#525252',
    margin: '16px 0',
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

const noticeSection = {
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    padding: '20px',
    margin: '32px 0',
    border: '1px solid #fbbf24',
};

const noticeText = {
    fontSize: '14px',
    lineHeight: '20px',
    color: '#78350f',
    margin: '8px 0',
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
