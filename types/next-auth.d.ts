import { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            password_change_required?: boolean
        } & DefaultSession["user"]
    }

    interface User {
        id: string
        full_name?: string
        password_hash?: string
        password_change_required?: boolean
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        password_change_required?: boolean
    }
}
