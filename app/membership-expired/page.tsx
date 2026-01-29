import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";

export default function MembershipExpiredPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 dark:bg-zinc-900">
            <div className="flex w-full max-w-md flex-col items-center rounded-xl bg-white p-8 text-center shadow-lg dark:bg-zinc-800">
                <div className="mb-6 rounded-full bg-red-100 p-4 text-red-500 dark:bg-red-900/20">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-shield-alert"
                    >
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <path d="M12 8v4" />
                        <path d="M12 16h.01" />
                    </svg>
                </div>

                <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Membership Expired
                </h1>

                <p className="mb-8 text-gray-600 dark:text-gray-400">
                    Your membership is no longer active. To continue accessing your training plans and tracking tools, please renew your membership.
                </p>

                <div className="mb-6 w-full rounded-lg bg-blue-50 p-4 text-left dark:bg-blue-900/20">
                    <h3 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">
                        How to Renew:
                    </h3>
                    <ul className="list-inside list-disc space-y-1 text-sm text-blue-800 dark:text-blue-200">
                        <li>Purchase a new membership package</li>
                        <li>Contact <strong>Team Sourav Fitness</strong> for assistance</li>
                    </ul>
                </div>

                <div className="flex w-full flex-col gap-3">
                    <Link
                        href="/"
                        className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                    >
                        Return to Home
                    </Link>

                    <LogoutButton />

                    <div className="mt-4 text-xs text-gray-400">
                        If you believe this is an error, please contact support.
                    </div>
                    {/* give option to logout ot switch account here */}
                </div>
            </div>
        </div>
    );
}
