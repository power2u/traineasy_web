import { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role: 'user' | 'super_admin'
            password_change_required?: boolean
            hasActiveMembership?: boolean
        } & DefaultSession["user"]
    }

    interface User {
        id: string
        role: 'user' | 'super_admin'
        full_name?: string
        password_hash?: string
        password_change_required?: boolean
        hasActiveMembership?: boolean
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: 'user' | 'super_admin'
        password_change_required?: boolean
        hasActiveMembership?: boolean
    }
}
