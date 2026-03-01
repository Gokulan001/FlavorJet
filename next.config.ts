import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "media.istockphoto.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "staticcookist.akamaized.net" },
      { protocol: "https", hostname: "goodeggs4.imgix.net" },
      { protocol: "https", hostname: "img.delicious.com.au" },
      { protocol: "https", hostname: "img.taste.com.au" },
      { protocol: "https", hostname: "img.freepik.com" },
      { protocol: "https", hostname: "static01.nyt.com" },
      { protocol: "https", hostname: "static.diabetesfoodhub.org" },
      { protocol: "https", hostname: "images.slurrp.com" },
      { protocol: "https", hostname: "www.tastingtable.com" },
      { protocol: "https", hostname: "www.brookshirebrothers.com" },
      { protocol: "https", hostname: "foodhub.scene7.com" },
      { protocol: "https", hostname: "cdn.pixabay.com" },
      { protocol: "https", hostname: "4.bp.blogspot.com" },
      { protocol: "https", hostname: "png.pngtree.com" },
    ],
  },
};

export default nextConfig;
