import { Wrench, Clock, ShieldCheck } from "lucide-react";

export default function MaintenancePage() {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-4">
            <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">

                {/* Icon Container */}
                <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-pulse blur-xl"></div>
                    <div className="relative bg-gray-800 p-5 rounded-full border border-gray-700 shadow-2xl">
                        <Wrench className="w-10 h-10 text-blue-400 animate-spin-slow" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-gray-800 p-2 rounded-full border border-gray-700">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    </div>
                </div>

                {/* Text Content */}
                <div className="space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        System Maintenance
                    </h1>
                    <p className="text-gray-400 text-lg leading-relaxed">
                        We are currently upgrading our database infrastructure to provide you with a faster and more secure experience.
                    </p>
                </div>

                {/* Status Indicators */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-800 p-4 rounded-xl flex flex-col items-center gap-2">
                        <Clock className="w-6 h-6 text-amber-400" />
                        <span className="text-sm font-medium text-gray-300">Estimated Time</span>
                        <span className="text-xs text-gray-500">~few hours</span>
                    </div>
                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-800 p-4 rounded-xl flex flex-col items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                        <span className="text-sm font-medium text-gray-300">Status</span>
                        <span className="text-xs text-gray-500">Migrating Data</span>
                    </div>
                </div>

                <div className="pt-8">
                    <p className="text-xs text-gray-600">
                        TrainEasy &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </div>
    );
}
