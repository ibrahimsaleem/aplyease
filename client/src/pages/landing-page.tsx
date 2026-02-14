import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  CheckCircle,
  Menu,
  X,
  ArrowRight,
  Briefcase,
  Users,
  Cpu,
  MessageSquare,
  DollarSign,
  Star,
  Phone,
  Mail,
  Zap,
  Target,
  TrendingUp,
  Clock,
  Globe,
  Laptop
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FuturisticBackground } from "@/components/ui/futuristic-background";
import { motion } from "framer-motion";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPromo, setShowPromo] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPromo(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Promo Modal */}
      <Dialog open={showPromo} onOpenChange={setShowPromo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary">Limited Time Offer! 🎉</DialogTitle>
            <DialogDescription className="text-base pt-4">
              Get started with HireEase today and receive exclusive benefits for early adopters.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-700 mb-4">Special launch pricing - Save up to 20% on selected packages!</p>
          </div>
          <DialogFooter className="sm:justify-center">
            <a href="https://wa.me/+17138537974?text=I%20want%20to%20get%20the%20deal%2020%25%20off%20on%20selected%20packages" className="w-full">
              <Button className="w-full" size="lg">Get the Deal</Button>
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="bg-primary text-white p-2 rounded-lg">
                  <Briefcase className="h-5 w-5" />
                </div>
                <span className="text-xl font-bold text-slate-900">HireEase</span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => scrollToSection("features")} className="text-slate-600 hover:text-primary transition-colors font-medium">
                Features
              </button>
              <button onClick={() => scrollToSection("pricing")} className="text-slate-600 hover:text-primary transition-colors font-medium">
                Pricing
              </button>
              <Link href="/resume-formatter" className="text-slate-600 hover:text-primary transition-colors font-medium">
                Free Resume Tool
              </Link>
              <Link href="/work-with-us" className="text-slate-600 hover:text-primary transition-colors font-medium">
                Work With Us
              </Link>
              <a href="https://wa.me/+17138537974?text=I%20want%20to%20know%20about%20the%20service" className="text-slate-600 hover:text-primary transition-colors font-medium">
                Contact
              </a>
              <Link href="/login">
                <Button>Login</Button>
              </Link>
              <Link href="/signup?role=client">
                <Button variant="outline">Get Started</Button>
              </Link>
            </nav>

            {/* Mobile Login Button - Always visible */}
            <div className="md:hidden flex items-center gap-2">
              <Link href="/login">
                <Button size="sm">Login</Button>
              </Link>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-slate-600"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>

            {/* Desktop Menu Button (hidden, kept for consistency) */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="hidden p-2 text-slate-600"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-200">
              <button onClick={() => scrollToSection("features")} className="block w-full text-left py-3 text-slate-600 hover:text-primary font-medium">
                Features
              </button>
              <button onClick={() => scrollToSection("pricing")} className="block w-full text-left py-3 text-slate-600 hover:text-primary font-medium">
                Pricing
              </button>
              <Link href="/resume-formatter" className="block w-full text-left py-3 text-slate-600 hover:text-primary font-medium">
                Free Resume Tool
              </Link>
              <Link href="/work-with-us" className="block w-full text-left py-3 text-slate-600 hover:text-primary font-medium">
                Work With Us
              </Link>
              <a href="https://wa.me/+17138537974?text=I%20want%20to%20know%20about%20the%20service" className="block w-full text-left py-3 text-slate-600 hover:text-primary font-medium">
                Contact
              </a>
              <div className="pt-4 flex flex-col gap-2">
                <Link href="/login">
                  <Button className="w-full">Login</Button>
                </Link>
                <Link href="/signup?role=client">
                  <Button variant="outline" className="w-full">Get Started</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      <main>
        {/* Hero Section */}
        {/* Hero Section */}
        <FuturisticBackground className="pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 mb-6">
                  HireEase helps you land the right job — <span className="text-primary">faster</span>.
                </h1>
                <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
                  An AI-powered job application platform backed by trained human specialists. We find roles, tailor resumes, and apply on your behalf.
                </p>
              </motion.div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Link href="/signup?role=client">
                  <Button size="lg" className="w-full sm:w-auto text-lg px-8 h-14">
                    Get Started as Client <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/signup?role=employee">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg px-8 h-14">
                    Work With Us
                  </Button>
                </Link>
                <Button size="lg" className="w-full sm:w-auto text-lg px-8 h-14 bg-green-600 hover:bg-green-700 text-white border-none" asChild>
                  <a href="https://wa.me/+17138537974?text=I%20want%20to%20know%20about%20the%20service">Chat on WhatsApp</a>
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-3xl mx-auto">
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-1">22K+</div>
                  <div className="text-sm md:text-base text-slate-600">Applications Submitted</div>
                </div>
                <div className="text-center border-x border-slate-200">
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-1">100+</div>
                  <div className="text-sm md:text-base text-slate-600">Clients Supported</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-1">16</div>
                  <div className="text-sm md:text-base text-slate-600">Application Specialists</div>
                </div>
              </div>
            </div>
          </div>
        </FuturisticBackground>

        {/* Free Resume Tool CTA */}
        <section className="py-12 md:py-16 bg-slate-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <Badge className="bg-green-100 text-green-800 mb-4 border-none">
                Free Tool
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
                Make the Best Resume Ever — Trusted by 1,000,000+ People
              </h2>
              <p className="text-slate-600 mb-6 text-sm md:text-base">
                Paste your existing resume text and instantly get a one-page, ATS-optimized resume in our most trusted default format —
                the same layout our internal team uses for HireEase clients.
              </p>
              <Link href="/resume-formatter">
                <Button size="lg" className="text-lg px-8 h-12">
                  Use Free Resume Tool <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How HireEase Works</h2>
              <p className="text-lg text-slate-600">AI + Human Intelligence for better results</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  icon: <Cpu className="h-10 w-10 text-primary" />,
                  title: "AI + Human Intelligence",
                  desc: "AI generates job-specific resumes. Human experts review, refine, and submit.",
                  color: "bg-blue-50"
                },
                {
                  icon: <Target className="h-10 w-10 text-primary" />,
                  title: "Smart Job Matching",
                  desc: "We identify roles aligned with your skills, experience, and career goals.",
                  color: "bg-purple-50"
                },
                {
                  icon: <Zap className="h-10 w-10 text-primary" />,
                  title: "Faster Interviews",
                  desc: "More relevant applications → higher response rates → better interviews.",
                  color: "bg-amber-50"
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2, duration: 0.5 }}
                  viewport={{ once: true }}
                >
                  <Card className="border-none shadow-lg hover:shadow-2xl transition-all duration-300 bg-white/80 backdrop-blur-md h-full hover:-translate-y-1">
                    <CardContent className="p-8 text-center h-full flex flex-col items-center">
                      <div className="mb-6 inline-block">
                        <div className={`p-4 ${feature.color} rounded-2xl group-hover:scale-110 transition-transform`}>
                          {feature.icon}
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-slate-900">{feature.title}</h3>
                      <p className="text-slate-600">{feature.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>



        {/* Testimonials */}
        <section className="py-16 md:py-24 bg-slate-50">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-slate-900">What Clients Say</h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <Card className="border-none shadow-md">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4 text-amber-400">
                    {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                  </div>
                  <p className="text-slate-700 mb-4">"Amazing service! Submitted 500 applications, got 14 interviews. I could never found these opportunities and apply so many jobs, saved so much of my time."</p>
                  <div>
                    <p className="font-semibold text-slate-900">Mohammad Raza</p>
                    <p className="text-sm text-slate-500">University of Houston, Construction Management</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-md">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4 text-amber-400">
                    {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                  </div>
                  <p className="text-slate-700 mb-4">"Great team, understood my goals perfectly. Found opportunities I'd have missed."</p>
                  <div>
                    <p className="font-semibold text-slate-900">Rafi</p>
                    <p className="text-sm text-slate-500">University of Houston</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4 text-amber-400">
                    {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                  </div>
                  <p className="text-slate-700 mb-4">"AI and human support made my search efficient. Professional and detail-oriented. Landed good interviews."</p>
                  <div>
                    <p className="font-semibold text-slate-900">Azhar Ahmed</p>
                    <p className="text-sm text-slate-500">Lamar University</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4 text-amber-400">
                    {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                  </div>
                  <p className="text-slate-700 mb-4">"The resume tailoring is incredibly accurate. I got calls from companies I thought were out of my league."</p>
                  <div>
                    <p className="font-semibold text-slate-900">Saif Uddin</p>
                    <p className="text-sm text-slate-500">Data Analyst, Lamar University</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4 text-amber-400">
                    {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                  </div>
                  <p className="text-slate-700 mb-4">"HireEase saved me mostly from the depression of job hunting. It just works."</p>
                  <div>
                    <p className="font-semibold text-slate-900">Aziz</p>
                    <p className="text-sm text-slate-500">Industrial Engineer, University of Houston</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4 text-amber-400">
                    {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                  </div>
                  <p className="text-slate-700 mb-4">"The team helped me navigate the complex cybersecurity job market. Fantastic results."</p>
                  <div>
                    <p className="font-semibold text-slate-900">Manaswini Golla</p>
                    <p className="text-sm text-slate-500">Master in Cybersecurity, University of Houston</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* LinkedIn & Portfolio Optimization Package */}
        <section className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Professional Profile Optimization Package
              </h2>
              <p className="text-lg text-slate-600">
                Get a polished portfolio website and a standout LinkedIn profile in one done-for-you package.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <Card className="border-2 border-slate-100 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Briefcase className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-bold text-slate-900">1. Portfolio Website — $149</h3>
                  </div>
                  <ul className="space-y-3 text-slate-700 text-sm md:text-base">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <span>Custom, responsive portfolio profile.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <span>Free .com domain &amp; SSL for 1 year.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <span>Up to five project showcases (live demo, GitHub, docs).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <span>Hosting &amp; deployment included.</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-2 border-slate-100 shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-bold text-slate-900">2. LinkedIn Optimization — $149</h3>
                  </div>
                  <ul className="space-y-3 text-slate-700 text-sm md:text-base">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <span>Complete profile makeover (headline, About, roles, banner, projects).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <span>10 project highlight posts crafted for your niche.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <span>10 industry insight posts to build authority.</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="mt-12 text-center">
              <p className="text-xl md:text-2xl font-semibold text-slate-900 mb-2">
                Total Investment: <span className="text-primary font-bold">$298</span>
              </p>
              <p className="text-slate-600 mb-6 text-sm md:text-base">
                Timeline ≈ 4 weeks • Kick-off, build, LinkedIn overhaul, and final polish included.
              </p>
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white border-none px-8 h-12"
                asChild
              >
                <a href="https://wa.me/+17138537974?text=I%20want%20the%20LinkedIn%20%26%20portfolio%20optimization%20package">
                  Chat on WhatsApp about LinkedIn Package
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Simple Pricing</h2>
              <p className="text-lg text-slate-600">Choose your plan, start today</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {/* Basic */}
              <Card className="border-2 border-slate-200 hover:border-primary transition-colors">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <p className="text-sm font-semibold text-slate-600 mb-2">BASIC</p>
                    <div className="text-4xl font-bold text-primary mb-2">$125</div>
                    <p className="text-slate-600 text-sm">One-time Payment</p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">250 Job applications</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">1 Dedicated Human Assistant</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">AI-powered application tools</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">Job Matching</span>
                    </li>
                  </ul>
                  <Link href="/signup?package=basic">
                    <Button variant="outline" className="w-full h-11">Get Started</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Standard */}
              <Card className="border-2 border-slate-200 hover:border-primary transition-colors relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-green-500 text-white hover:bg-green-500 px-3 py-1 text-xs font-semibold uppercase">
                    Most Popular
                  </Badge>
                </div>
                <CardContent className="p-6 pt-8">
                  <div className="text-center mb-6">
                    <p className="text-sm font-semibold text-slate-600 mb-2">STANDARD</p>
                    <div className="text-4xl font-bold text-primary mb-2">$299</div>
                    <p className="text-slate-600 text-sm">One-time Payment</p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">500 Job applications</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">1 Application Specialist</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">Custom resumes for each job</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">Human review & refinement</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">Job Matching</span>
                    </li>
                  </ul>
                  <Link href="/signup?package=standard">
                    <Button variant="outline" className="w-full h-11">Get Started</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* $350 Plan */}
              <Card className="border-2 border-slate-200 hover:border-primary transition-colors">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <p className="text-sm font-semibold text-slate-600 mb-2">PREMIUM</p>
                    <div className="text-4xl font-bold text-primary mb-2">$350</div>
                    <p className="text-slate-600 text-sm">One-time Payment</p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">1000 Job applications</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">2 Application Specialists</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">AI-powered application tools</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">Job Matching</span>
                    </li>
                  </ul>
                  <Link href="/signup?package=premium">
                    <Button variant="outline" className="w-full h-11">Get Started</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Ultimate Bundle - Best Value */}
              <Card className="border-2 border-primary shadow-xl">
                <div className="bg-primary text-white text-center py-2 text-sm font-semibold uppercase">
                  Best Value!
                </div>
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-primary mb-2">$599</div>
                    <p className="text-slate-600 text-sm">One-time Payment</p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">1000 Job applications</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">2 Application Specialists</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">Custom resumes for each job</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">Human review & refinement</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">Job Matching</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">Expert Resume Review*</span>
                    </li>
                  </ul>
                  <Link href="/signup?package=ultimate">
                    <Button className="w-full h-11">Get Started</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Earn With Us Section */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-blue-50 to-white overflow-hidden relative">
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="max-w-4xl mx-auto text-center mb-16">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-sm px-4 py-1.5 mb-6 border-none">Hiring Now</Badge>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-slate-900 leading-tight">
                Turn Your Free Time Into <span className="text-primary">Real Income</span>
              </h2>
              <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Join our global team of Application Specialists. Earn competitive pay in USD, work from anywhere, on your own schedule.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-16">
              <Card className="bg-white border-slate-200 shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-green-600">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Earn in USD</h3>
                  <p className="text-slate-600">Get paid in stable currency for every application you process.</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-primary">
                    <Clock className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Flexible Hours</h3>
                  <p className="text-slate-600">Work whenever you want. Convert your free time into earnings.</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-purple-600">
                    <Globe className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Remote First</h3>
                  <p className="text-slate-600">Work from home or anywhere in the world. All you need is internet.</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-amber-600">
                    <Laptop className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Easy to Start</h3>
                  <p className="text-slate-600">We provide all tools and training. No prior experience needed.</p>
                </CardContent>
              </Card>
            </div>

            <div className="text-center">
              <Link href="/signup?role=employee">
                <Button size="lg" className="text-lg px-8 h-14">
                  Start Earning Today <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <p className="mt-4 text-slate-500 text-sm">
                Limited spots available. Join 200+ specialists worldwide.
              </p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-lg mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Get Started Today</h2>
              <p className="text-lg text-slate-600 mb-8">Questions? We're here to help</p>
              <Card className="border-none shadow-lg">
                <CardContent className="p-6 space-y-4">
                  <form action="https://formspree.io/f/mgvawbjw" method="POST" className="space-y-4">
                    <Input name="name" placeholder="Your name" className="h-12 text-base" required />
                    <Input name="email" type="email" placeholder="Your email" className="h-12 text-base" required />
                    <Textarea name="message" placeholder="Your message" className="min-h-[120px] text-base" required />
                    <Button type="submit" className="w-full h-12 text-base">Send Message</Button>
                  </form>
                  <div className="pt-4 border-t border-slate-100">
                    <a href="https://wa.me/+17138537974?text=I%20want%20to%20know%20about%20the%20service">
                      <Button className="w-full h-12 text-base bg-green-600 hover:bg-green-700 text-white border-none">
                        <MessageSquare className="mr-2 h-5 w-5" />
                        Chat on WhatsApp
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 text-white mb-4">
              <Briefcase className="h-6 w-6" />
              <span className="text-xl font-bold">HireEase</span>
            </div>
            <p className="text-sm max-w-md mx-auto mb-6">
              Transforming job search with AI + human expertise
            </p>
            <div className="flex justify-center gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="https://wa.me/+17138537974?text=I%20want%20to%20know%20about%20the%20service" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm">
            <p>&copy; 2026 HireEase. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
