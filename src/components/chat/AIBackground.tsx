"use client";

import { motion } from "framer-motion";

export default function AIBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f0f4ff] via-[#e8eeff] to-[#f5f0ff] dark:from-[#060a13] dark:via-[#0f172b] dark:to-[#0a1628]" />

      {/* Animated orbs — visible in both modes with different opacities */}
      <motion.div
        animate={{ opacity: [0.06, 0.12, 0.06], x: [0, 20, 0], y: [0, -15, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-[#fea116] rounded-full blur-[200px]"
      />
      <motion.div
        animate={{ opacity: [0.04, 0.10, 0.04], x: [0, -15, 0], y: [0, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute bottom-[15%] right-[10%] w-[450px] h-[450px] bg-[#7c3aed] rounded-full blur-[180px] opacity-[0.03] dark:opacity-[0.04]"
      />
      <motion.div
        animate={{ opacity: [0.03, 0.08, 0.03] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 6 }}
        className="absolute top-[55%] left-[45%] w-[350px] h-[350px] bg-[#e89000] rounded-full blur-[150px]"
      />

      {/* Subtle grain overlay */}
      <div className="absolute inset-0 opacity-[0.012] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4xNSIvPjwvc3ZnPg==')]" />
    </div>
  );
}
