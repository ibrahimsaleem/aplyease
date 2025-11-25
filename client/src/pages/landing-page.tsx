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
  Linkedin,
  Zap,
  Target,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

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
              Get started with AplyEase today and receive exclusive benefits for early adopters.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-700 mb-4">Special launch pricing - Save up to 30% on all packages!</p>
          </div>
          <DialogFooter className="sm:justify-center">
            <a href="https://wa.me/+17138537974" className="w-full">
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
                <span className="text-xl font-bold text-slate-900">AplyEase</span>
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
              <a href="https://wa.me/+17138537974" className="text-slate-600 hover:text-primary transition-colors font-medium">
                Contact
              </a>
              <Link href="/login">
                <Button>Login</Button>
              </Link>
              <Link href="/signup">
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
              <a href="https://wa.me/+17138537974" className="block w-full text-left py-3 text-slate-600 hover:text-primary font-medium">
                Contact
              </a>
              <div className="pt-4 flex flex-col gap-2">
                <Link href="/login">
                  <Button className="w-full">Login</Button>
                </Link>
                <Link href="/signup">
                  <Button variant="outline" className="w-full">Get Started</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-12 pb-16 md:pt-20 md:pb-24 bg-gradient-to-b from-slate-50 to-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 mb-6">
                Land Your Dream Job <span className="text-primary">Faster</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
                AI-powered job applications with human expertise. We apply to jobs for you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Link href="/signup">
                  <Button size="lg" className="w-full sm:w-auto text-lg px-8 h-14">
                    Start Free <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 h-14" asChild>
                  <a href="https://wa.me/+17138537974">Chat on WhatsApp</a>
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-3xl mx-auto">
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-1">22K+</div>
                  <div className="text-sm md:text-base text-slate-600">Applications</div>
                </div>
                <div className="text-center border-x border-slate-200">
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-1">100+</div>
                  <div className="text-sm md:text-base text-slate-600">Clients</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-1">16</div>
                  <div className="text-sm md:text-base text-slate-600">Team Members</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
              <p className="text-lg text-slate-600">Simple, fast, effective</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-8 text-center">
                  <div className="mb-6 inline-block">
                    <div className="p-4 bg-blue-50 rounded-2xl">
                      <Cpu className="h-10 w-10 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900">AI + Human Power</h3>
                  <p className="text-slate-600">AI creates custom resumes, humans refine and submit</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-8 text-center">
                  <div className="mb-6 inline-block">
                    <div className="p-4 bg-blue-50 rounded-2xl">
                      <Target className="h-10 w-10 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900">Perfect Matches</h3>
                  <p className="text-slate-600">We find roles that fit your skills and career goals</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-8 text-center">
                  <div className="mb-6 inline-block">
                    <div className="p-4 bg-blue-50 rounded-2xl">
                      <Zap className="h-10 w-10 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900">Fast Results</h3>
                  <p className="text-slate-600">Get more interviews in less time with our automation</p>
                </CardContent>
              </Card>
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
                  <Link href="/signup">
                    <Button variant="outline" className="w-full h-11">Get Started</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Standard */}
              <Card className="border-2 border-slate-200 hover:border-primary transition-colors">
                <CardContent className="p-6">
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
                      <span className="text-slate-700 text-sm">1 Dedicated Human Assistant</span>
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
                  <Link href="/signup">
                    <Button variant="outline" className="w-full h-11">Get Started</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Best Value */}
              <Card className="border-2 border-primary shadow-xl">
                <div className="bg-primary text-white text-center py-2 text-sm font-semibold uppercase">
                  Best Value!
                </div>
                <CardContent className="p-6">
                  <div className="text-center mb-6">
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
                      <span className="text-slate-700 text-sm">2 Dedicated Human Assistants</span>
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
                  <Link href="/signup">
                    <Button className="w-full h-11">Get Started</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Ultimate Bundle */}
              <Card className="border-2 border-slate-200 hover:border-primary transition-colors relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-green-500 text-white hover:bg-green-500 px-3 py-1 text-xs font-semibold uppercase">
                    Most Popular
                  </Badge>
                </div>
                <CardContent className="p-6 pt-8">
                  <div className="text-center mb-6">
                    <p className="text-sm font-semibold text-slate-600 mb-2">ULTIMATE BUNDLE</p>
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
                      <span className="text-slate-700 text-sm">2 Dedicated Human Assistants</span>
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
                  <Link href="/signup">
                    <Button variant="outline" className="w-full h-11">Get Started</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Founder */}
        <section className="py-16 md:py-24 bg-slate-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <Card className="border-none shadow-xl">
                <CardContent className="p-8 md:p-10">
                  <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                        MS
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-slate-900 mb-1">Mohammad Ibrahim Saleem</h3>
                      <p className="text-lg text-primary font-semibold mb-4">Founder & CEO</p>
                      <p className="text-slate-700 mb-4 leading-relaxed">
                        AI engineer at NOV and researcher at University of Houston. Building intelligent automation systems to help people land their dream jobs.
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
                        <Badge className="bg-blue-100 text-blue-800">AI & GenAI</Badge>
                        <Badge className="bg-blue-100 text-blue-800">Cybersecurity</Badge>
                        <Badge className="bg-blue-100 text-blue-800">Python</Badge>
                      </div>
                      <a
                        href="https://www.linkedin.com/in/ibrahimsaleem91"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-medium"
                      >
                        <Linkedin className="h-5 w-5" />
                        Connect on LinkedIn
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                  <Input placeholder="Your name" className="h-12 text-base" />
                  <Textarea placeholder="Your message" className="min-h-[120px] text-base" />
                  <Button className="w-full h-12 text-base">Send Message</Button>
                  <div className="pt-4">
                    <a href="https://wa.me/+17138537974">
                      <Button variant="outline" className="w-full h-12 text-base">
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
              <span className="text-xl font-bold">AplyEase</span>
            </div>
            <p className="text-sm max-w-md mx-auto mb-6">
              Transforming job search through intelligent automation
            </p>
            <div className="flex justify-center gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="https://wa.me/+17138537974" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm">
            <p>&copy; 2024 AplyEase. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
