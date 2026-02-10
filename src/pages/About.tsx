import { motion } from "framer-motion";
import { ArrowLeft, Heart, Users, Star, Shield, Target, Sparkles, Mail, Globe, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";

const About = () => {
  const navigate = useNavigate();

  const teamMembers = [
    {
      name: "StreamRate Team",
      role: "Development & Design",
      image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=400&fit=crop&crop=face",
      description: "Passionate developers and designers building the future of streamer communities.",
    },
    {
      name: "Community Managers",
      role: "Support & Moderation",
      image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop&crop=face",
      description: "Dedicated to maintaining a safe and welcoming environment for all users.",
    },
    {
      name: "Content Creators",
      role: "Partnership & Growth",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
      description: "Working closely with streamers to enhance their presence on our platform.",
    },
  ];

  const values = [
    {
      icon: Heart,
      title: "Community First",
      description: "We believe in putting our community at the heart of everything we do. Every feature, update, and decision is made with our users in mind.",
    },
    {
      icon: Shield,
      title: "Trust & Safety",
      description: "Maintaining a safe environment is our top priority. We implement robust measures to protect our users and their data.",
    },
    {
      icon: Sparkles,
      title: "Innovation",
      description: "We constantly push boundaries to deliver cutting-edge features that enhance how fans connect with their favorite streamers.",
    },
    {
      icon: Users,
      title: "Inclusivity",
      description: "StreamRate welcomes everyone. We celebrate diversity and strive to create an inclusive space for all gaming enthusiasts.",
    },
  ];

  const stats = [
    { value: "50K+", label: "Active Users" },
    { value: "1M+", label: "Ratings Given" },
    { value: "10K+", label: "Streamers" },
    { value: "99.9%", label: "Uptime" },
  ];

  return (
    <AppLayout showBottomNav={true}>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">About Us</h1>
            <div className="w-9" />
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
          <div className="relative px-6 py-16 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6">
                <Star className="w-10 h-10 text-primary-foreground" />
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-4">
                StreamRate
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                The Ultimate Platform for Streamer Discovery & Community Engagement
              </p>
              <div className="flex flex-wrap justify-center gap-8">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-3xl font-bold text-primary">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="px-6 py-12 bg-secondary/30">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Target className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Our Mission</h2>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">
                At StreamRate, we're on a mission to revolutionize how fans discover, 
                connect with, and support their favorite content creators. We believe 
                every streamer deserves recognition, and every fan deserves a platform 
                where their voice matters. By bridging the gap between creators and 
                their communities, we're building more than just an app—we're creating 
                a movement that celebrates the passion and dedication of the streaming world.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Values Section */}
        <section className="px-6 py-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 bg-card rounded-2xl border border-border"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <value.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section - Hidden */}

        {/* Features Section */}
        <section className="px-6 py-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">What We Offer</h2>
            <div className="space-y-4">
              {[
                { icon: Star, title: "Rating System", desc: "Rate and review your favorite streamers with our comprehensive rating system." },
                { icon: Zap, title: "Real-time Updates", desc: "Stay connected with live notifications and instant content updates." },
                { icon: Users, title: "Community Features", desc: "Engage with fellow fans through comments, posts, and reels." },
                { icon: Globe, title: "Global Reach", desc: "Connect with streamers and fans from around the world." },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-4 p-4 bg-card rounded-xl border border-border"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="px-6 py-12 bg-secondary/30">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">Get In Touch</h2>
            <p className="text-muted-foreground mb-6">
              Have questions, suggestions, or just want to say hello? We'd love to hear from you!
            </p>
            <a
              href="mailto:seketefilmstv@gmail.com"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              <Mail className="w-5 h-5" />
              seketefilmstv@gmail.com
            </a>
            <p className="text-sm text-muted-foreground mt-6">
              © {new Date().getFullYear()} StreamRate. All rights reserved.
            </p>
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default About;
