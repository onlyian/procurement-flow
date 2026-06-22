import { Link } from "wouter";
import { Package, BarChart3, ClipboardList, ShieldCheck, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const features = [
  {
    icon: ClipboardList,
    title: "Request Management",
    description: "Process employee procurement requests with one-click approve or reject actions. Automatic stock deduction keeps inventory accurate.",
  },
  {
    icon: Package,
    title: "Inventory Tracking",
    description: "Full CRUD for your item catalog. Low-stock alerts surface issues before they become blockers. Track every SKU in real time.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Recharts-powered usage breakdowns by department. Spot spending patterns and inventory turnover at a glance.",
  },
  {
    icon: Zap,
    title: "Google Forms Webhook",
    description: "Employees submit requests via Google Forms. A secure webhook auto-creates pending requests in the system — zero manual entry.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Admin Portal",
    description: "Clerk-powered authentication keeps the dashboard locked down to authorized procurement admins only.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto px-6 flex h-14 items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg text-primary">
            <div className="bg-primary text-primary-foreground p-1 rounded-md">
              <Package className="h-4 w-4" />
            </div>
            ProcurementFlow
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 pt-24 pb-20 text-center max-w-4xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground mb-8">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          Enterprise procurement, simplified
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-foreground leading-tight mb-6">
          From request to fulfillment,{" "}
          <span className="text-primary">fully automated</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          ProcurementFlow connects employee Google Form submissions directly to your admin dashboard. Approve requests, manage stock, and monitor analytics — all in one place.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/sign-up">
            <Button size="lg" className="gap-2">
              Get started <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button size="lg" variant="outline">
              Sign in to dashboard
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border bg-muted/30">
        <div className="container mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "100%", label: "Stock accuracy" },
            { value: "< 1s", label: "Webhook processing" },
            { value: "Zero", label: "Manual data entry" },
            { value: "Real-time", label: "Analytics" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-20 max-w-5xl">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight mb-3">Everything you need to manage procurement</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Built for procurement admins who need visibility, speed, and reliability without the complexity.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="group border border-border rounded-xl p-6 bg-card hover:border-primary/30 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <f.icon className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-sm">{f.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 py-16 text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">Ready to streamline procurement?</h2>
          <p className="text-primary-foreground/80 mb-8">
            Sign up and start processing requests in minutes.
          </p>
          <Link href="/sign-up">
            <Button size="lg" variant="secondary" className="gap-2">
              Start now <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-6">
          ProcurementFlow — automated inventory and request management
        </div>
      </footer>
    </div>
  );
}
