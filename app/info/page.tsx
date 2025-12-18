'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { Card, Button } from '@heroui/react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Globe, LogOut, Info, Share2 } from 'lucide-react';
import Link from 'next/link';

export default function AppInfoPage() {
  const { signOut } = useAuth();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Train Easy',
          text: 'Check out Train Easy - Your fitness tracking companion!',
          url: window.location.origin,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy link to clipboard
      navigator.clipboard.writeText(window.location.origin);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="container mx-auto max-w-2xl p-4 pb-24 md:pb-4">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Info className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">App Info</h1>
        </div>
        <p className="text-sm text-default-500">
          About this app and settings
        </p>
      </div>

      {/* App Version */}
      <Card className="mb-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-12 w-12" />
            <div>
              <h2 className="text-lg font-semibold">Train Easy</h2>
              <p className="text-sm text-default-500">Version 0.1.0</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Theme Settings */}
      <Card className="mb-4 p-4">
        <h3 className="text-base font-semibold">Theme</h3>
        <p className="text-sm text-default-500 mb-3">
          Choose your preferred theme
        </p>
        <ThemeToggle showLabel={true} />
      </Card>

      {/* Social Links */}
      <Card className="mb-4 p-4">
        <h3 className="text-base font-semibold mb-3">Connect With Us</h3>
        
        <div className="space-y-2">
          <Link
            href="https://www.instagram.com/itssouravfitness_official/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full px-4 py-2 rounded-lg hover:bg-default-100 transition-colors"
          >
            <svg 
              className="w-5 h-5 flex-shrink-0" 
              fill="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            <span>Follow us on Instagram</span>
          </Link>

          <Link
            href="https://teamsouravfitness.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full px-4 py-2 rounded-lg hover:bg-default-100 transition-colors"
          >
            <Globe className="w-5 h-5 flex-shrink-0" />
            <span>Visit our Website</span>
          </Link>
        </div>
      </Card>

      {/* Share App */}
      <Card className="mb-4 p-4">
        <h3 className="text-base font-semibold mb-2">Share App</h3>
        <p className="text-sm text-default-500 mb-3">
          Share Train Easy with your friends
        </p>
        <Button
          variant="primary"
          onPress={handleShare}
          className="w-full flex items-center justify-center gap-2"
        >
          <Share2 className="w-5 h-5" />
          <span>Share App</span>
        </Button>
      </Card>

     
    </div>
  );
}
