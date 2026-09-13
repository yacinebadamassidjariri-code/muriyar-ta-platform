import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { type Locale } from "@/lib/i18n/routing";
import { listHomepageStories } from "@/lib/data/stories";
import { deriveExcerpt } from "@/lib/utils/excerpt";
import { FullHomeHeroMedia } from "@/components/home/full-home-hero-media";
import styles from "@/components/home/full-home.module.css";

const copy = {
  en: {
    heroLabel: "Anonymous · safe · yours", heroTitle: "A safe place to share your story.",
    heroBody: "Muriyar Ta is where girls and young women share their experiences—anonymously and on their own terms.",
    share: "Share your story", read: "Read stories",
    safety: "No name or account required. Nothing is published without your consent.",
    trust: ["Anonymous by default", "Read by a trained person", "You choose what happens next"],
    voicesLabel: "Voices", voicesTitle: "In their own words.", allVoices: "Read all stories", empty: "The first stories will appear here soon.",
    howLabel: "How sharing works", howTitle: "Your story stays in your hands.",
    steps: [["Write anonymously", "Share only what you choose. No account or name is needed."], ["A person reads it", "A trained team member reviews it with care."], ["You decide", "It stays private unless you consent to publication."]],
    impactLabel: "Why stories matter", impactTitle: "Shared voices can build awareness and inform change.",
    learn: "How we protect your story", discover: "Explore Muriyar Ta",
    pathways: [["Podcast", "/podcast"], ["Resources", "/resources"], ["Partner with us", "/partner"]],
  },
  fr: {
    heroLabel: "Anonyme · sûr · à vous", heroTitle: "Un espace sûr pour partager votre histoire.",
    heroBody: "Muriyar Ta permet aux filles et aux jeunes femmes de partager leurs expériences, anonymement et à leur rythme.",
    share: "Partager mon histoire", read: "Lire les récits",
    safety: "Aucun nom ni compte requis. Rien n’est publié sans votre consentement.",
    trust: ["Anonyme par défaut", "Lu par une personne formée", "Vous décidez de la suite"],
    voicesLabel: "Récits", voicesTitle: "Avec leurs propres mots.", allVoices: "Lire tous les récits", empty: "Les premiers récits apparaîtront bientôt ici.",
    howLabel: "Comment ça marche", howTitle: "Votre histoire reste entre vos mains.",
    steps: [["Écrivez anonymement", "Partagez seulement ce que vous souhaitez. Aucun compte ni nom requis."], ["Une personne vous lit", "Un membre formé de l’équipe relit votre récit avec soin."], ["Vous décidez", "Il reste privé sans votre accord pour le publier."]],
    impactLabel: "Pourquoi les récits comptent", impactTitle: "Les voix partagées peuvent sensibiliser et nourrir le changement.",
    learn: "Comment nous protégeons votre récit", discover: "Découvrir Muriyar Ta",
    pathways: [["Podcast", "/podcast"], ["Ressources", "/resources"], ["Devenir partenaire", "/partner"]],
  },
} as const;

export async function FullHome({ locale }: { locale: Locale }) {
  setRequestLocale(locale);
  const c = locale === "fr" ? copy.fr : copy.en;
  const stories = await listHomepageStories(3);

  return <div className={styles.page}>
    <section className={styles.hero} aria-labelledby="home-title">
      <div className={styles.heroMedia}><FullHomeHeroMedia /></div><div className={styles.heroShade} aria-hidden="true" />
      <div className={styles.heroInner}><div className={styles.heroCopy}>
        <p className={styles.eyebrow}>{c.heroLabel}</p><h1 id="home-title">{c.heroTitle}</h1><p className={styles.heroBody}>{c.heroBody}</p>
        <div className={styles.actions}><Link className={styles.primaryAction} href="/submit">{c.share}<ArrowRight aria-hidden="true" /></Link><Link className={styles.textActionLight} href="/stories">{c.read}</Link></div>
        <p className={styles.safety}><ShieldCheck aria-hidden="true" />{c.safety}</p>
      </div></div>
    </section>

    <ul className={styles.trustStrip} aria-label={c.learn}>{c.trust.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul>

    <section className={styles.voices} aria-labelledby="voices-title">
      <header className={styles.sectionIntro}><p className={styles.eyebrow}>{c.voicesLabel}</p><h2 id="voices-title">{c.voicesTitle}</h2><Link className={styles.textAction} href="/stories">{c.allVoices}<ArrowRight aria-hidden="true" /></Link></header>
      {stories.length ? <ol className={styles.storyList}>{stories.map((story) => <li key={story.story_id}><Link href={`/stories/${story.slug}`}>{story.tags[0]?.name ? <span className={styles.storyTheme}>{story.tags[0].name}</span> : null}<blockquote>“{deriveExcerpt(story.body_text, 190)}”</blockquote><span className={styles.storyMeta}>Anonymous · {story.language_code.toUpperCase()}</span></Link></li>)}</ol> : <p className={styles.empty}>{c.empty}</p>}
    </section>

    <section className={styles.process} aria-labelledby="process-title">
      <header className={styles.processIntro}><p className={styles.eyebrow}>{c.howLabel}</p><h2 id="process-title">{c.howTitle}</h2><Link className={styles.textActionLight} href="/submit">{c.learn}<ArrowRight aria-hidden="true" /></Link></header>
      <ol className={styles.steps}>{c.steps.map(([title, body], index) => <li key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol>
    </section>

    <section className={styles.impact} aria-labelledby="impact-title">
      <div><p className={styles.eyebrow}>{c.impactLabel}</p><h2 id="impact-title">{c.impactTitle}</h2></div>
    </section>

    <nav className={styles.pathways} aria-label={c.discover}>
      <p>{c.discover}</p>
      <ul>{c.pathways.map(([label, href]) => <li key={href}><Link href={href}>{label}<ArrowRight aria-hidden="true" /></Link></li>)}</ul>
    </nav>
  </div>;
}
