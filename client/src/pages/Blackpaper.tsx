import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowLeft,
  BookOpen,
  ShieldAlert,
  Zap,
  Lock,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Blackpaper() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 md:py-16 max-w-4xl relative">
        <Link href="/">
          <Button
            variant="outline"
            size="sm"
            className="mb-8 border-primary/20 text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <div className="text-center space-y-6 mb-16 border-b-2 border-primary/20 pb-16">
            <div className="inline-flex items-center justify-center p-6 bg-accent/10 rounded-full mb-6 border-2 border-accent/20">
              <BookOpen className="w-16 h-16 text-accent" />
            </div>
            <h1 className="text-5xl md:text-7xl font-black font-heading text-white tracking-tight text-shadow-glow">
              WEBD2 <span className="text-accent">BLACKPAPER</span>
            </h1>
            <p className="font-mono bg-accent text-black px-6 py-2 rounded-md tracking-[0.1em] inline-block uppercase text-lg font-black shadow-lg shadow-accent/20">
              The "Finally, I Understand" Guide
            </p>
          </div>

          <div className="prose prose-invert max-w-none font-mono space-y-12">
            <section className="space-y-8">
              <h2 className="text-3xl text-accent font-black mb-6 border-b-2 border-accent/20 pb-4">
                Welcome to WEBD2ollar 2!
              </h2>
              <p className="text-white text-2xl leading-relaxed font-bold">
                Have you ever tried to understand cryptocurrency or the
                blockchain, only to get a headache from words like
                "cryptography," "nodes," or "gas fees"?
              </p>
              <p className="text-white/80 text-xl leading-relaxed mt-6">
                This guide is different. By the time you finish reading this
                short paper, you will finally understand exactly how crypto
                works, why WEBD2ollar 2 is special, and why you should feel 100%
                confident opening your very first wallet right now.
              </p>
            </section>

            <section className="bg-card/30 p-6 md:p-8 rounded-xl border border-primary/10">
              <h2 className="text-2xl text-white font-bold mb-4 flex items-center">
                <BookOpen className="text-primary mr-3 w-6 h-6" /> What actually
                *is* the Blockchain?
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Imagine a giant, digital notebook that everyone in the world
                shares. If Billy gives Sally 5 dollars, Billy writes in the
                notebook, <em>"I gave Sally 5 dollars."</em>
              </p>
              <p className="text-muted-foreground leading-relaxed">
                But here’s the trick: before that ink dries, thousands of other
                people look at the notebook. They say, "Wait, let me check
                Billy's pocket. Yep, Billy actually had 5 dollars, and he really
                gave it to Sally." Once everyone agrees, the page is permanently
                stamped, and no one—not even a hacker or a bank—can ever erase
                it.{" "}
                <strong>
                  That giant, un-erasable notebook is the Blockchain.
                </strong>
              </p>
            </section>

            <section className="bg-card/30 p-6 md:p-8 rounded-xl border border-primary/10">
              <h2 className="text-2xl text-white font-bold mb-4 flex items-center">
                <Zap className="text-accent mr-3 w-6 h-6" /> What makes
                WEBD2ollar 2 different?
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                To read and write in older crypto notebooks (like Bitcoin), you
                had to buy expensive computers. It was like forcing people to
                build a post office in their living room just to send a letter.
                Because it was so hard, the system broke down and got incredibly
                slow.
              </p>
              <p className="text-muted-foreground leading-relaxed text-accent/90 font-bold border-l-2 border-accent pl-4 mt-6">
                WEBD2ollar 2 (WEBD2) fixed this by changing the rules. We put the
                entire post office directly inside your everyday internet
                browser (Chrome, Safari, or your smartphone). You don't install
                anything. You just go to the website.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Because your regular web browser does the heavy lifting, we call
                your phone a <strong>"Routing Node."</strong> You are literally
                helping pass the notes securely just by having the website open!
              </p>
            </section>

            <section className="bg-card/30 p-6 md:p-8 rounded-xl border border-primary/10">
              <h2 className="text-2xl text-white font-bold mb-4 flex items-center">
                <Users className="text-primary mr-3 w-6 h-6" /> Why "More
                People" equals "More Speed"
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Think of a traffic jam on a highway. On old blockchains, more
                cars meant worse traffic.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                But WEBD2ollar 2 is like magic: every time a new person opens the
                site, they don't just add a car—
                <em>they build a brand-new lane on the highway</em>. The more
                people that join WEBD2ollar 2, the stronger, faster, and safer
                the highway gets! This is called "Infinite Scalability," and
                it's why WEBD2ollar 2 will never slow down.
              </p>
            </section>

            <section className="bg-card/30 p-6 md:p-8 rounded-xl border border-primary/10">
              <h2 className="text-2xl text-white font-bold mb-4 flex items-center">
                <Lock className="text-accent mr-3 w-6 h-6" /> How is it Secure?
                (The Unbreakable Digital Lock)
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                If everyone can see the notebook, how do we know someone won't
                steal your money? When you open a wallet, you are given a secret
                12-word password. This combination is tied to an invisible,
                unbreakable digital lock (called <code>ed25519</code>{" "}
                cryptography).
              </p>
              <p className="text-muted-foreground leading-relaxed">
                When you click "Send," your web browser mathematically locks the
                money using your secret combination. By the time it leaves your
                phone, nobody can intercept it or steal it. And the best part?
                It's completely <strong>free</strong> to send. No fees. No
                middlemen. No banks.
              </p>
            </section>

            <section className="bg-card/30 p-6 md:p-8 rounded-xl border border-primary/10">
              <h2 className="text-2xl text-white font-bold mb-4 flex items-center">
                <Zap className="text-primary mr-3 w-6 h-6" /> The Secret Weapon:
                The DIELBS Engine
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                If your phone is passing the notes, who is doing the actual
                permanent stamping in the giant notebook? That job belongs to a
                super-fast, proprietary machine we built called the{" "}
                <strong className="text-white">DIELBS Engine</strong>. Think of
                DIELBS as the fastest, smartest accountant in the universe.
                Instead of taking 10 minutes (like Bitcoin) to verify the math,
                the DIELBS engine verifies the math in the blink of an eye—less
                than one millisecond!
              </p>
            </section>

            <section className="bg-card/30 p-6 md:p-8 rounded-xl border border-primary/10">
              <h2 className="text-2xl text-white font-bold mb-4 flex items-center">
                <Zap className="text-accent mr-3 w-6 h-6" /> Sending Crypto Like
                Sending an Email
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                We know long, complicated crypto addresses are scary. WEBD2ollar
                2 fixed this too. You can easily link a simple name (an{" "}
                <strong>Alias</strong>) to your wallet. You can send money to{" "}
                <code>grandpa@webd2</code> instantly, just like typing an email
                address!
              </p>

              <div className="bg-destructive/10 border-l-4 border-destructive p-6 rounded-r-lg mt-8 mb-6">
                <h3 className="text-destructive font-bold text-xl mb-2 flex items-center">
                  <ShieldAlert className="mr-2" /> ⚠️ The Golden Rule of Crypto
                </h3>
                <p className="text-destructive/90 leading-relaxed font-bold">
                  Whether you are using a long address or a short Alias, it is
                  absolutely unforgiving and 100% case-sensitive.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-2 text-sm italic">
                  If you mean to send money to <code>grandpa@webd2</code> but
                  you accidentally capitalize it like <code>Grandpa@webd2</code>{" "}
                  or spell it wrong, the money will be sent to the wrong place.
                  Because there are no middlemen, there is no "undo" button.
                  There is no customer service line to call, and no bank manager
                  to reverse it. The coins are gone bye-bye, permanently. In the
                  crypto world, you are your own bank—so you must always be
                  cautious and double-check your spelling every single time!
                </p>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                And if you ever need to buy a gift privately? Just flip the{" "}
                <strong>Private Transaction</strong> switch. The DIELBS Engine
                will securely process the transaction while completely hiding
                who sent the money and who received it.
              </p>
            </section>

            <div className="text-center pt-20 pb-12 border-t border-primary/20">
              <h2 className="text-4xl font-black text-white mb-8 tracking-tight">
                ARE YOU READY?
              </h2>
              <p className="text-white/70 text-2xl mb-12 max-w-2xl mx-auto font-bold leading-relaxed">
                Everything you just read is happening live on the network. There is nothing to install, nothing to buy, and nothing to fear.
              </p>
              <Link href="/auth">
                <Button className="btn-neon text-2xl px-12 py-12 h-auto w-full sm:w-auto font-black tracking-widest shadow-2xl shadow-primary/30 border-2 border-primary/50">
                  OPEN YOUR WALLET NOW
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
