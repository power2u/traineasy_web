"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
    return (
        <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="mt-2 text-sm text-gray-500 hover:text-gray-700 underline dark:text-gray-400 dark:hover:text-gray-200"
        >
            Sign out / Switch Account
        </button>
    );
}
