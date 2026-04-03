import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { GithubIcon, LinkedinIcon } from "@/components/Icons";
import { 
  Mail, 
  User, 
  Briefcase, 
  GraduationCap, 
  Award 
} from "lucide-react";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1 flex flex-col items-center py-16 px-4 sm:px-6 lg:px-8">
        
        {/* Profile Header (Jolla Template Style) */}
        <div className="flex flex-col items-center text-center mb-16">
          <div className="relative w-[15em] h-[15em] mb-6 rounded-full overflow-hidden border-4 border-muted/50 shadow-lg">
            <Image
              src="/profile.jpg"
              alt="Harry Zhong"
              fill
              className="object-cover"
              priority
            />
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6">
            Harry Zhong
          </h1>
          
          {/* Social Links */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="https://www.linkedin.com/in/harry2687/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
            >
              <LinkedinIcon className="w-5 h-5" />
              <span className="font-medium">LinkedIn</span>
            </Link>
            <Link 
              href="https://github.com/Harry2687" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
            >
              <GithubIcon className="w-5 h-5" />
              <span className="font-medium">Github</span>
            </Link>
            <Link 
              href="mailto:h.zhong2687@gmail.com" 
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
            >
              <Mail className="w-5 h-5" />
              <span className="font-medium">Email</span>
            </Link>
          </div>
        </div>

        {/* Content Sections */}
        <div className="max-w-3xl w-full flex flex-col gap-10">
          
          {/* About Me */}
          <section>
            <h3 className="flex items-center gap-3 text-2xl font-bold mb-4 border-b border-border pb-2">
              <User className="w-6 h-6 text-muted-foreground" />
              About Me
            </h3>
            <p className="text-lg text-foreground/90 leading-relaxed font-light">
              I am an Actuary (AIAA) working at Commonwealth Bank where I implement capital and provisions models. 
              Sometimes I code using Python or R, if I make something interesting it'll end up on here.
            </p>
          </section>

          {/* Experience */}
          <section>
            <h3 className="flex items-center gap-3 text-2xl font-bold mb-4 border-b border-border pb-2">
              <Briefcase className="w-6 h-6 text-muted-foreground" />
              Experience
            </h3>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline">
                <div className="font-medium text-lg"><strong>Commonwealth Bank</strong> | Senior Analyst</div>
                <div className="text-muted-foreground text-sm">Dec 2025 - Present</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline">
                <div className="font-medium text-lg"><strong>Commonwealth Bank</strong> | Data Scientist (Secondment)</div>
                <div className="text-muted-foreground text-sm">Oct 2025 - Dec 2025</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline">
                <div className="font-medium text-lg"><strong>Commonwealth Bank</strong> | Analyst</div>
                <div className="text-muted-foreground text-sm">Aug 2024 - Nov 2025</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline">
                <div className="font-medium text-lg"><strong>EBM Insurance & Risk</strong> | Data Analyst</div>
                <div className="text-muted-foreground text-sm">Nov 2022 - Jul 2024</div>
              </div>
            </div>
          </section>

          {/* Education */}
          <section>
            <h3 className="flex items-center gap-3 text-2xl font-bold mb-4 border-b border-border pb-2">
              <GraduationCap className="w-6 h-6 text-muted-foreground" />
              Education
            </h3>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline">
                <div className="font-medium text-lg"><strong>Curtin University</strong> | Bachelor of Science (Actuarial Science) (Honours)</div>
                <div className="text-muted-foreground text-sm">Feb 2019 - Jun 2023</div>
              </div>
            </div>
          </section>

          {/* Certifications */}
          <section>
            <h3 className="flex items-center gap-3 text-2xl font-bold mb-4 border-b border-border pb-2">
              <Award className="w-6 h-6 text-muted-foreground" />
              Certifications
            </h3>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline">
                <div className="font-medium text-lg"><strong>Actuaries Institute</strong> | Fellowship Program (Banking)</div>
                <div className="text-muted-foreground text-sm">Jan 2025 - May 2025</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline">
                <div className="font-medium text-lg"><strong>Actuaries Institute</strong> | Actuary Program</div>
                <div className="text-muted-foreground text-sm">Jul 2023 - Oct 2023</div>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border mt-16">
        <p>© {new Date().getFullYear()} Harry Zhong. All rights reserved.</p>
      </footer>
    </>
  );
}
