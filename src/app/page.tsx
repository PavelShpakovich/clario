import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { getTranslations } from 'next-intl/server';
import { LandingFooter } from '@/components/layout/landing-footer';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Upload, Sparkles, BrainCircuit, MessageSquare, Check } from 'lucide-react';

export default async function HomePage() {
  const session = await auth();
  if (session) redirect('/dashboard');

  const t = await getTranslations('landing');

  const features = [
    { icon: Upload, title: t('feature1Title'), desc: t('feature1Desc') },
    { icon: Sparkles, title: t('feature2Title'), desc: t('feature2Desc') },
    { icon: BrainCircuit, title: t('feature3Title'), desc: t('feature3Desc') },
    { icon: MessageSquare, title: t('feature4Title'), desc: t('feature4Desc') },
  ];

  const steps = [
    { number: t('step1Number'), title: t('step1Title'), desc: t('step1Desc') },
    { number: t('step2Number'), title: t('step2Title'), desc: t('step2Desc') },
    { number: t('step3Number'), title: t('step3Title'), desc: t('step3Desc') },
  ];

  const plans = [
    {
      name: t('plan1Name'),
      price: t('plan1Price'),
      cards: t('plan1Cards'),
      features: [t('plan1Feature1'), t('plan1Feature2'), t('plan1Feature3'), t('plan1Feature4')],
      popular: false,
    },
    {
      name: t('plan2Name'),
      price: t('plan2Price'),
      cards: t('plan2Cards'),
      features: [t('plan2Feature1'), t('plan2Feature2'), t('plan2Feature3'), t('plan2Feature4')],
      popular: true,
    },
    {
      name: t('plan3Name'),
      price: t('plan3Price'),
      cards: t('plan3Cards'),
      features: [t('plan3Feature1'), t('plan3Feature2'), t('plan3Feature3'), t('plan3Feature4')],
      popular: false,
    },
    {
      name: t('plan4Name'),
      price: t('plan4Price'),
      cards: t('plan4Cards'),
      features: [t('plan4Feature1'), t('plan4Feature2'), t('plan4Feature3'), t('plan4Feature4')],
      popular: false,
    },
  ];

  const faqs = [
    { q: t('faq1Question'), a: t('faq1Answer') },
    { q: t('faq2Question'), a: t('faq2Answer') },
    { q: t('faq3Question'), a: t('faq3Answer') },
    { q: t('faq4Question'), a: t('faq4Answer') },
    { q: t('faq5Question'), a: t('faq5Answer') },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <section className="flex flex-col items-center justify-center text-center px-4 py-24 sm:py-32 bg-linear-to-b from-background to-muted/30">
        <span className="inline-block mb-4 text-xs font-semibold tracking-widest uppercase text-primary">
          {t('heroTagline')}
        </span>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl mb-6">
          {t('heroHeadline')}
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mb-10">
          {t('heroSubheadline')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" asChild>
            <Link href="/register">{t('ctaGetStarted')}</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">{t('ctaLogin')}</Link>
          </Button>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('featuresTitle')}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('featuresSubtitle')}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('howItWorksTitle')}</h2>
            <p className="text-muted-foreground text-lg">{t('howItWorksSubtitle')}</p>
          </div>
          <div className="flex flex-col gap-8">
            {steps.map(({ number, title, desc }) => (
              <div key={number} className="flex gap-6 items-start">
                <div className="w-12 h-12 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                  {number}
                </div>
                <div>
                  <h3 className="font-semibold text-xl mb-1">{title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('pricingTitle')}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('pricingSubtitle')}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-6 shadow-sm ${
                  plan.popular ? 'border-primary bg-primary/5 ring-2 ring-primary' : 'bg-card'
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    {t('pricingPopular')}
                  </Badge>
                )}
                <div className="mb-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">{plan.name}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground pb-1">{t('pricingPerMonth')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{plan.cards}</p>
                </div>
                <ul className="flex flex-col gap-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button asChild variant={plan.popular ? 'default' : 'outline'} className="w-full">
                  <Link href="/register">{t('pricingCta')}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('faqTitle')}</h2>
            <p className="text-muted-foreground text-lg">{t('faqSubtitle')}</p>
          </div>
          <Accordion type="single" collapsible className="flex flex-col gap-2">
            {faqs.map((faq, idx) => (
              <AccordionItem
                key={idx}
                value={`faq-${idx}`}
                className="rounded-xl border bg-card px-4"
              >
                <AccordionTrigger className="text-left font-medium py-4">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
