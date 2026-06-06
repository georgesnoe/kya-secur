import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    allowedDevOrigins: ['192.168.1.124'],
    async headers() {
        return [
            {
                source: "/api/:path*",
                headers: [
                    { key: "Access-Control-Allow-Origin", value: "*" },
                    { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
                    { key: "Access-Control-Allow-Headers", value: "Content-Type" },
                ],
            },
        ];
    },
}

export default nextConfig
