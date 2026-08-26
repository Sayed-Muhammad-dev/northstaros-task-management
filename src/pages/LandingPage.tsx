import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  LineChart,
  Menu,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Workflow,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart, DonutStat } from "../components/charts";
import { LogoMark } from "../components/brand";
import { Badge, Button, Card, SectionHeader } from "../components/ui";
import { brand, trustedCompanies } from "../data/mockData";
import { useAppStore } from "../hooks/useAppStore";
import { cn } from "../utils/helpers";

const featureList = [
  {
    title: "Execution-grade task orchestration",
    description: "Move work from backlog to shipped with structured ownership, deadlines, approvals, and priority signals.",
    icon: Workflow,
  },
  {
    title: "Live delivery intelligence",
    description: "Track project health, workload, velocity, deadline exposure, and launch readiness without leaving the workspace.",
    icon: LineChart,
  },
  {
    title: "Premium team collaboration",
    description: "Unify member context, messages, notifications, reviews, and reporting in one operational layer.",
    icon: ShieldCheck,
  },
];

const brandPillars = [
  {
    title: "Brand identity",
    description: "NorthstarOS is positioned as a premium work operating system for product, engineering, operations, and client delivery teams.",
    icon: BriefcaseBusiness,
  },
  {
    title: "Mission",
    description: brand.mission,
    icon: Target,
  },
  {
    title: "Business goals",
    description: "Reduce coordination overhead, improve deadline predictability, and create a category-credible SaaS product for paid teams.",
    icon: Sparkles,
  },
];

const faqs = [
  {
    q: "Who is NorthstarOS designed for?",
    a: "NorthstarOS is built for product, engineering, operations, marketing, and client delivery teams that need more structure than chat and spreadsheets can provide.",
  },
  {
    q: "Does it support both startup and enterprise use cases?",
    a: "Yes. The information architecture, permissions UI, reporting surfaces, and workspace controls were designed to feel credible for fast-moving startups and scaled organizations.",
  },
  {
    q: "Can teams manage delivery and reporting in the same tool?",
    a: "Yes. Planning, execution, calendars, reporting, analytics, and collaboration all live in one system so context does not fracture across tools.",
  },
  {
    q: "Why would a team choose NorthstarOS over generic task tools?",
    a: "Because it is designed around operational clarity, not just list management. Teams get executive-ready reporting, role-aware collaboration, and polished workflow surfaces in one product.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "$19",
    subtitle: "For individuals and compact teams that need structure without admin overhead.",
    features: ["Unlimited tasks", "2 active projects", "Basic analytics", "Calendar planning"],
  },
  {
    name: "Growth",
    price: "$49",
    subtitle: "For cross-functional teams shipping on deadlines and reporting to leadership.",
    features: ["Unlimited projects", "Advanced reporting", "Calendar and team workload", "Priority collaboration tools"],
    featured: true,
  },
  {
    name: "Scale",
    price: "Custom",
    subtitle: "For enterprise workspaces with stricter governance, onboarding, and visibility needs.",
    features: ["Permissions controls", "Enterprise onboarding", "Priority support", "Custom rollout planning"],
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [previewDay, setPreviewDay] = useState(11);
  const { pushToast, projects, tasks } = useAppStore();

  const stats = useMemo(
    () => [
      { label: "Active teams", value: "2,300+" },
      { label: "Weekly tasks delivered", value: "184k" },
      { label: "Average reporting time saved", value: "11.4 hrs" },
      { label: "Launch readiness score", value: "96%" },
    ],
    [],
  );

  const selectedPreviewTasks = useMemo(() => tasks.filter((task) => Number(task.dueDate.slice(-2)) === previewDay).slice(0, 2), [previewDay, tasks]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(79,124,255,0.10),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_24%,#f8fafc_60%,#ffffff_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,rgba(79,124,255,0.16),transparent_28%),linear-gradient(180deg,#07111f_0%,#0b1020_50%,#0b1222_100%)] dark:text-white">
      <div className="border-b border-slate-200/70 bg-slate-950 px-4 py-3 text-center text-sm text-slate-200">
        <span className="font-semibold text-white">Now shipping:</span> portfolio, delivery, analytics, and reporting workflows in one enterprise-ready workspace.
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/75 backdrop-blur-2xl dark:border-white/10 dark:bg-ink-950/75">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <LogoMark tone="lightSurface" />
          <nav className="hidden items-center gap-8 text-sm font-medium lg:flex">
            <a href="#features" className="text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
              Features
            </a>
            <a href="#workflow" className="text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
              Workflow
            </a>
            <a href="#pricing" className="text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
              Pricing
            </a>
            <a href="#faq" className="text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
              FAQ
            </a>
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            <Link to="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link to="/register">
              <Button>Start free workspace</Button>
            </Link>
          </div>
          <Button variant="secondary" className="lg:hidden" onClick={() => setMobileMenu((current) => !current)}>
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        {mobileMenu && (
          <div className="border-t border-slate-200/70 bg-white px-4 py-4 dark:border-white/10 dark:bg-ink-900 lg:hidden">
            <div className="flex flex-col gap-3">
              <a href="#features" onClick={() => setMobileMenu(false)}>
                Features
              </a>
              <a href="#workflow" onClick={() => setMobileMenu(false)}>
                Workflow
              </a>
              <a href="#pricing" onClick={() => setMobileMenu(false)}>
                Pricing
              </a>
              <a href="#faq" onClick={() => setMobileMenu(false)}>
                FAQ
              </a>
              <Link to="/login" onClick={() => setMobileMenu(false)}>
                Log in
              </Link>
              <Link to="/register" onClick={() => setMobileMenu(false)}>
                Start free workspace
              </Link>
            </div>
          </div>
        )}
      </header>

      <section className="relative px-4 pb-24 pt-16 text-white sm:px-6 lg:px-8">
        <div className="absolute inset-x-0 top-6 -z-10 mx-auto h-[460px] max-w-6xl rounded-full bg-brand-500/20 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="space-y-8">
            <Badge>Premium SaaS for modern delivery teams</Badge>
            <div className="space-y-6">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
                Run execution, planning, reporting, and team coordination from one operating system.
              </h1>
              <p className="max-w-2xl text-lg text-slate-300 sm:text-xl">{brand.productDescription}</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/register">
                <Button>
                  Launch NorthstarOS <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="secondary"
                onClick={() =>
                  pushToast({ title: "Demo requested", description: "A product specialist will follow up with a guided enterprise walkthrough." })
                }
              >
                <Play className="h-4 w-4" /> Watch product preview
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {["92% on-time delivery", "38% faster reporting", "SOC2-ready permissions UI"].map((item) => (
                <div key={item} className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 backdrop-blur-xl">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="animate-float">
            <Card className="overflow-hidden rounded-[36px] border-white/10 bg-white/10 p-0 text-white backdrop-blur-2xl">
              <div className="border-b border-white/10 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.28em] text-brand-100">Live workspace</p>
                    <h3 className="mt-2 text-2xl font-semibold">Executive Delivery Console</h3>
                  </div>
                  <Badge>Q3 launch</Badge>
                </div>
              </div>
              <div className="grid gap-5 p-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {stats.slice(0, 2).map((stat) => (
                      <div key={stat.label} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-slate-300">{stat.label}</p>
                        <p className="mt-3 text-3xl font-semibold">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-300">Task velocity</p>
                        <h4 className="text-xl font-semibold">Delivery trend</h4>
                      </div>
                      <LineChart className="h-5 w-5 text-brand-200" />
                    </div>
                    <BarChart
                      items={[
                        { label: "Completed", value: 86, tone: "mint" },
                        { label: "In progress", value: 63, tone: "brand" },
                        { label: "At risk", value: 28, tone: "amber" },
                      ]}
                    />
                  </div>
                </div>
                <div className="space-y-5">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-300">Current flagship project</p>
                        <h4 className="mt-2 text-xl font-semibold">{projects[0].name}</h4>
                        <p className="mt-2 text-sm text-slate-300">{projects[0].summary}</p>
                      </div>
                      <Button
                        variant="secondary"
                        className="border-white/10 bg-white/10 text-white hover:bg-white/15 dark:text-white"
                        onClick={() => navigate("/app/dashboard")}
                      >
                        Open
                      </Button>
                    </div>
                    <div className="mt-5 space-y-3">
                      {tasks.slice(0, 3).map((task) => (
                        <button
                          key={task.id}
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/20 p-3 text-left transition hover:border-white/20 hover:bg-white/10"
                          onClick={() => navigate(`/app/tasks/${task.id}`)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium">{task.title}</p>
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </div>
                          <div className="mt-3 h-2 rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-cyan-300" style={{ width: `${task.progress}%` }} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {stats.slice(2).map((stat) => (
                      <div key={stat.label} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-slate-300">{stat.label}</p>
                        <p className="mt-3 text-3xl font-semibold">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 rounded-[32px] border border-slate-200/70 bg-white/90 p-6 shadow-panel dark:border-white/10 dark:bg-white/5 lg:grid-cols-5">
          {trustedCompanies.map((company) => (
            <div
              key={company}
              className="flex items-center justify-center rounded-3xl border border-slate-200/70 bg-white/70 px-4 py-5 text-sm font-semibold tracking-[0.18em] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            >
              {company}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="relative overflow-hidden">
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/70 to-transparent" />
              <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
              <p className="mt-4 text-4xl font-semibold">{stat.value}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Brand"
          title="A realistic product identity, not a placeholder shell."
          description="NorthstarOS is framed like a commercial SaaS launch: clear mission, strong positioning, and a visual system built for trust."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {brandPillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Card key={pillar.title} className="relative overflow-hidden">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-brand-500/10 blur-2xl" />
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-500/10">
                  <Icon className="h-5 w-5 text-brand-600" />
                </div>
                <h3 className="mt-5 text-xl font-semibold">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{pillar.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Features"
          title="Built for focused execution and clean visibility."
          description="NorthstarOS combines premium product design with real operational depth. These surfaces are designed to support work, not just decorate it."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {featureList.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className={`animate-rise [animation-delay:${index * 120}ms] hover:-translate-y-1 transition`}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-500/10">
                  <Icon className="h-5 w-5 text-brand-600" />
                </div>
                <h3 className="mt-5 text-xl font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-r from-brand-500/8 via-cyan-400/8 to-transparent" />
            <SectionHeader
              eyebrow="Workflow"
              title="Delivery surfaces that connect strategy to execution."
              description="Teams can move fluidly between planning, status updates, boards, and calendars without losing context."
            />
            <div className="grid gap-5 md:grid-cols-2">
              <Card className="bg-slate-50 dark:bg-white/5">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Kanban preview</p>
                <div className="mt-4 space-y-3">
                  {["Backlog", "Todo", "In Progress", "Review"].map((column, index) => (
                    <div key={column} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{column}</p>
                        <Badge>{index + 2} cards</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="bg-slate-50 dark:bg-white/5">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Calendar preview</p>
                <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs">
                  {Array.from({ length: 21 }).map((_, index) => {
                    const day = index + 1;
                    const active = previewDay === day;
                    return (
                      <button
                        key={day}
                        onClick={() => setPreviewDay(day)}
                        className={cn(
                          "rounded-2xl px-2 py-3 transition",
                          active
                            ? "bg-brand-500 text-white shadow-panel"
                            : "bg-white text-slate-600 hover:bg-brand-50 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10",
                        )}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 space-y-2">
                  {selectedPreviewTasks.length ? (
                    selectedPreviewTasks.map((task) => (
                      <div key={task.id} className="rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-left text-sm dark:border-white/10 dark:bg-white/5">
                        {task.title}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200/70 px-3 py-3 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                      No due items on this preview day.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </Card>
          <div className="grid gap-6">
            <DonutStat value={88} label="Analytics preview" description="Cross-team productivity score generated from completion velocity and workload balance." />
            <Card className="bg-slate-950 text-white dark:bg-white dark:text-slate-900">
              <Sparkles className="h-5 w-5 text-brand-200 dark:text-brand-500" />
              <h3 className="mt-4 text-2xl font-semibold">From weekly standups to executive reporting.</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300 dark:text-slate-600">
                NorthstarOS keeps tactical execution and strategic visibility in the same system, so the product feels credible for paying teams, not just a showcase.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Testimonials"
          title="Built to sound like a platform customers would actually buy."
          description="The positioning, reporting language, and workflow depth are intentionally commercial instead of portfolio-generic."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            "NorthstarOS gave our launch team the clarity we were missing across planning, dependencies, and reporting.",
            "We replaced fragmented status updates with one system that leadership actually trusts.",
            "The interface feels premium, but the real win is how quickly teams adopt it.",
          ].map((quote, index) => (
            <Card key={quote} className="relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/70 to-transparent" />
              <div className="flex gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, star) => (
                  <Star key={star} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-300">{quote}</p>
              <p className="mt-6 font-semibold text-slate-950 dark:text-white">{["Leah Mercer", "Jonas Vale", "Camila Reed"][index]}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {["COO, Pivotal Foundry", "VP Product, Helio Capital", "Program Director, Axiom Cloud"][index]}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Pricing"
          title="Pricing that fits high-growth and scaled teams."
          description="The plans read like something a real SaaS company would sell, with packaging that aligns to actual team maturity."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                "relative overflow-hidden",
                plan.featured && "border-brand-200 bg-brand-50/50 dark:border-brand-500/30 dark:bg-brand-500/10",
              )}
            >
              {plan.featured && <Badge>Most Popular</Badge>}
              <h3 className="mt-4 text-2xl font-semibold">{plan.name}</h3>
              <p className="mt-3 text-4xl font-semibold">{plan.price}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{plan.subtitle}</p>
              <div className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-brand-500" />
                    {feature}
                  </div>
                ))}
              </div>
              <Button
                className="mt-6 w-full"
                variant={plan.featured ? "primary" : "secondary"}
                onClick={() => {
                  pushToast({
                    title: `${plan.name} selected`,
                    description: plan.name === "Scale" ? "Enterprise sales will contact you shortly." : `${plan.name} plan is ready for workspace setup.`,
                  });
                  navigate("/register");
                }}
              >
                Choose {plan.name}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="FAQ" title="Questions buyers and operators would actually ask." />
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const open = faqOpen === index;
            return (
              <Card key={faq.q} className={cn("overflow-hidden p-0 transition", open && "border-brand-200 dark:border-brand-500/30")}>
                <button
                  className="flex w-full items-center justify-between px-6 py-5 text-left"
                  onClick={() => setFaqOpen((current) => (current === index ? null : index))}
                  aria-expanded={open}
                >
                  <span className="font-medium">{faq.q}</span>
                  <ChevronRight className={cn("h-4 w-4 transition duration-300", open && "rotate-90 text-brand-500")} />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-out",
                    open ? "grid-rows-[1fr] border-t border-slate-200/70 dark:border-white/10" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="px-6 py-5 text-sm leading-7 text-slate-600 dark:text-slate-300">{faq.a}</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Card className="bg-slate-950 text-white dark:bg-white dark:text-slate-900">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-brand-200 dark:text-brand-500">Newsletter</p>
              <h3 className="mt-3 text-3xl font-semibold">Get product notes, workflow tips, and launch updates.</h3>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-slate-400 dark:border-slate-200 dark:bg-slate-100"
                value={newsletterEmail}
                onChange={(event) => setNewsletterEmail(event.target.value)}
                placeholder="Work email"
              />
              <Button
                onClick={() =>
                  pushToast({
                    title: "Subscribed",
                    description: newsletterEmail ? `${newsletterEmail} will receive NorthstarOS updates.` : "Enter an email to subscribe.",
                  })
                }
              >
                Subscribe
              </Button>
            </div>
          </div>
        </Card>
      </section>

      <footer className="border-t border-slate-200/70 px-4 py-10 dark:border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <LogoMark tone="lightSurface" />
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">{brand.mission}</p>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            <p>{brand.companyName}</p>
            <p>Premium task management SaaS for delivery-focused teams.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
