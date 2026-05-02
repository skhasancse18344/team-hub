import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <h3>
            <span style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",width:26,height:26,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",borderRadius:6,fontSize:"0.85rem",marginRight:4 }}>🚀</span>
            TeamHub
          </h3>
          <p>The all-in-one collaboration platform for high-performing teams. Set goals, track milestones, ship together.</p>
        </div>

        <div className="footer-col">
          <h4>Product</h4>
          <ul>
            <li><Link href="/#features">Features</Link></li>
            <li><Link href="/#how-it-works">How it works</Link></li>
            <li><Link href="/#pricing">Pricing</Link></li>
            <li><Link href="/changelog">Changelog</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Company</h4>
          <ul>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/blog">Blog</Link></li>
            <li><Link href="/careers">Careers</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Legal</h4>
          <ul>
            <li><Link href="/privacy">Privacy Policy</Link></li>
            <li><Link href="/terms">Terms of Service</Link></li>
            <li><Link href="/security">Security</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-copy">© {new Date().getFullYear()} TeamHub. All rights reserved.</p>
        <div className="footer-legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/cookies">Cookies</Link>
        </div>
      </div>
    </footer>
  );
}
