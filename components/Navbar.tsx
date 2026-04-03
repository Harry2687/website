import Link from "next/link";
import { FlaskConical } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full h-[70px] bg-background/75 backdrop-blur-md border-b border-border transition-colors duration-300">
      <div className="container mx-auto max-w-4xl px-4 h-full flex items-center justify-between">
        <Link 
          href="/" 
          className="font-extrabold tracking-tight text-xl opacity-100 hover:opacity-70 transition-opacity duration-200"
        >
          Harry Zhong
        </Link>
        <div className="flex items-center space-x-6">
          <Link 
            href="/the_lab" 
            className="flex items-center space-x-2 font-medium text-[0.95rem] opacity-100 hover:opacity-70 transition-opacity duration-200"
          >
            <FlaskConical className="w-4 h-4" />
            <span>The Lab</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
