import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Button,
  Hr,
  Img,
} from '@react-email/components';

interface EmailVerificationProps {
  verificationLink: string;
  userEmail: string;
  baseUrl: string;
  supportEmail: string;
}

export default function EmailVerification({
  verificationLink,
  userEmail,
  baseUrl,
  supportEmail,
}: EmailVerificationProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Img
              src={`${baseUrl}/logo.png`}
              width="120"
              height="36"
              alt="TrainEasy"
              style={logo}
            />
          </Section>
          
          <Section style={content}>
            <Text style={heading}>Verify Your Email Address</Text>
            
            <Text style={paragraph}>
              Hi there! Welcome to TrainEasy. To complete your registration and start your fitness journey, please verify your email address.
            </Text>
            
            <Text style={paragraph}>
              Click the button below to verify your email address:
            </Text>
            
            <Section style={buttonContainer}>
              <Button style={button} href={verificationLink}>
                Verify Email Address
              </Button>
            </Section>
            
            <Text style={paragraph}>
              Or copy and paste this link into your browser:
            </Text>
            
            <Text style={link}>
              <Link href={verificationLink} style={linkStyle}>
                {verificationLink}
              </Link>
            </Text>
            
            <Hr style={hr} />
            
            <Text style={footer}>
              This verification link will expire in 24 hours for security reasons.
            </Text>
            
            <Text style={footer}>
              If you didn't create an account with TrainEasy, you can safely ignore this email.
            </Text>
            
            <Text style={footer}>
              Need help? Contact us at{' '}
              <Link href={`mailto:${supportEmail}`} style={linkStyle}>
                {supportEmail}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const logoContainer = {
  padding: '32px 20px',
  textAlign: 'center' as const,
};

const logo = {
  margin: '0 auto',
};

const content = {
  padding: '0 48px',
};

const heading = {
  fontSize: '24px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#484848',
  textAlign: 'center' as const,
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.4',
  color: '#484848',
  marginBottom: '16px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#007ee6',
  borderRadius: '4px',
  color: '#fff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
};

const link = {
  fontSize: '14px',
  color: '#007ee6',
  wordBreak: 'break-all' as const,
};

const linkStyle = {
  color: '#007ee6',
  textDecoration: 'underline',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '1.4',
  marginBottom: '8px',
};