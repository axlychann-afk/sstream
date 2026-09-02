import { Link } from "wouter";
import { Play } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4 w-fit">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <span className="font-bold text-xl tracking-tight">
                Donghua<span className="text-primary">Stream</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
              Your premium destination for Chinese animation. Watch the latest ongoing and completed donghua series with high quality streams and precise subtitles.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Navigation</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link href="/ongoing" className="hover:text-primary transition-colors">Ongoing</Link></li>
              <li><Link href="/completed" className="hover:text-primary transition-colors">Completed</Link></li>
              <li><Link href="/upcoming" className="hover:text-primary transition-colors">Upcoming</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">DMCA</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground text-center md:text-left">
            Disclaimer: This site does not store any files on its server. All contents are provided by non-affiliated third parties.
          </p>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} DonghuaStream. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
