import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  ChevronDown, 
  HelpCircle, 
  Star, 
  User, 
  Shield, 
  Bell, 
  Video, 
  Image, 
  Settings, 
  MessageCircle,
  Flag,
  Lock,
  Smartphone,
  Mail,
  Award,
  TrendingUp
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface HelpFAQModalProps {
  onClose: () => void;
}

const CONTACT_EMAIL = "seketefilmstv@gmail.com";

const FAQ_CATEGORIES = [
  {
    title: "Getting Started",
    icon: Smartphone,
    faqs: [
      {
        q: "What is StreamRate?",
        a: "StreamRate is a premier social platform that connects fans with their favorite content creators and streamers worldwide. Our platform enables authentic engagement through ratings, reviews, posts, reels, and real-time interaction. Whether you're a fan looking to discover new streamers or a creator building your community, StreamRate provides the tools you need to succeed."
      },
      {
        q: "How do I create an account?",
        a: "Creating an account is simple and takes less than a minute. Tap 'Sign Up' on the welcome screen, enter your email address, create a secure password, and choose whether you're joining as a Fan or Streamer. You'll receive a verification email to confirm your account. Once verified, you can customize your profile and start exploring!"
      },
      {
        q: "What's the difference between Fan and Streamer accounts?",
        a: "Fan accounts are designed for users who want to follow, rate, and engage with streamers. Streamer accounts include additional features like analytics, leaderboard eligibility, and the ability to receive ratings and reviews. Your role determines your experience on the platform and cannot be changed after signup to maintain authenticity."
      },
      {
        q: "Is StreamRate free to use?",
        a: "Yes! StreamRate is completely free to download and use. All core features including posting, rating, commenting, and following are available at no cost. We may introduce optional premium features in the future, but the essential StreamRate experience will always remain free."
      },
    ]
  },
  {
    title: "Ratings & Reviews",
    icon: Star,
    faqs: [
      {
        q: "How do ratings work?",
        a: "Fans can rate streamers on a scale of 1 to 5 stars. Your rating should reflect your genuine experience with the streamer's content, personality, and engagement. Each fan can rate a streamer once, but you can update your rating at any time if your opinion changes. All ratings contribute to the streamer's overall score and leaderboard position."
      },
      {
        q: "Can I change my rating after submitting?",
        a: "Absolutely! We understand that opinions can evolve. Visit the streamer's profile and tap the rating section to update your previous rating. Your new rating will immediately reflect on their profile and leaderboard standing."
      },
      {
        q: "What makes a good review?",
        a: "Great reviews are specific, constructive, and based on genuine experience. Mention what you enjoy about the streamer's content, their streaming style, how they engage with their community, or what makes them stand out. Avoid generic comments and focus on details that would help other fans discover quality streamers."
      },
      {
        q: "How is the leaderboard calculated?",
        a: "Our leaderboard uses a sophisticated algorithm that considers multiple factors: average rating, total number of ratings, recent engagement trends, content quality, and community interaction. This ensures that streamers who consistently deliver value to their audience rise to the top."
      },
    ]
  },
  {
    title: "Profile & Account",
    icon: User,
    faqs: [
      {
        q: "How do I edit my profile?",
        a: "Navigate to Settings > Edit Profile to update your username, bio, profile picture, header image, and country. A complete profile helps others discover you and builds trust within the community. Pro tip: Use a clear, recognizable profile picture and write a bio that showcases your personality!"
      },
      {
        q: "Can I change my username?",
        a: "Yes, you can change your username anytime through Settings > Edit Profile. Your new username must be unique and follow our community guidelines. Note that changing your username may affect how others find you, so choose wisely!"
      },
      {
        q: "How do I change my password?",
        a: "Go to Settings > Change Password. You'll need to enter your current password followed by your new password. For security, passwords must be at least 8 characters long. We recommend using a mix of letters, numbers, and special characters."
      },
      {
        q: "What if I forgot my password?",
        a: "On the login screen, tap 'Forgot Password' and enter your registered email address. We'll send you a secure link to reset your password. If you don't receive the email within a few minutes, check your spam folder or contact us at " + CONTACT_EMAIL
      },
    ]
  },
  {
    title: "Content & Posting",
    icon: Image,
    faqs: [
      {
        q: "What can I post on StreamRate?",
        a: "Share text updates, photos, and videos that showcase your personality and content. Fans can post about their favorite streamers, gaming moments, or community experiences. Streamers can share behind-the-scenes content, announcements, and engage with their audience. All content must comply with our Community Guidelines."
      },
      {
        q: "How do I create a Reel?",
        a: "Tap the Create button and select 'Create Reel'. You can record directly or upload existing video content. Our editor allows you to trim clips, add music from our library, select custom thumbnails, and add captions with hashtags. Reels are a powerful way to grow your audience and showcase your best moments!"
      },
      {
        q: "Can I delete my posts?",
        a: "Yes, you have full control over your content. Navigate to your profile, find the post or reel you want to remove, tap the three-dot menu, and select 'Delete'. Deleted content is permanently removed and cannot be recovered."
      },
      {
        q: "How do hashtags work?",
        a: "Hashtags help categorize your content and make it discoverable. Add relevant hashtags to your posts and reels using the # symbol. Popular hashtags appear on the Explore page, helping new users find your content. Use specific, relevant hashtags rather than generic ones for better reach."
      },
    ]
  },
  {
    title: "Privacy & Security",
    icon: Shield,
    faqs: [
      {
        q: "Who can see my profile?",
        a: "By default, your profile is public and visible to all StreamRate users. You can change this in Settings > Profile Visibility to make your profile private, limiting visibility to approved followers only. Even with a public profile, you control who can comment and interact with your content."
      },
      {
        q: "How do I control my Last Seen status?",
        a: "Navigate to Settings > Last Seen to manage who can see when you were last active. Options include 'Everyone', 'Followers Only', or 'Off'. When set to Off, others won't see your online status, but you also won't see theirs."
      },
      {
        q: "How do I block someone?",
        a: "Visit the user's profile or content, tap the three-dot menu, and select 'Report & Block'. Blocked users cannot see your profile, interact with your content, or contact you. You can manage blocked users in Settings > Blocked Users."
      },
      {
        q: "Is my data secure?",
        a: "We take security seriously. Your data is encrypted in transit and at rest using industry-standard protocols. We never sell your personal information to third parties. For more details, please review our Privacy Policy."
      },
    ]
  },
  {
    title: "Notifications",
    icon: Bell,
    faqs: [
      {
        q: "How do I manage notifications?",
        a: "Go to Settings > Notifications to customize which alerts you receive. You can toggle notifications for ratings, reviews, comments, likes, new followers, and more. We recommend keeping essential notifications on to stay connected with your community."
      },
      {
        q: "Why am I not receiving notifications?",
        a: "First, check that notifications are enabled in your StreamRate settings. Then verify that your device's notification permissions for StreamRate are turned on in your phone's settings. If issues persist, try logging out and back in, or contact us at " + CONTACT_EMAIL
      },
    ]
  },
  {
    title: "Troubleshooting",
    icon: Settings,
    faqs: [
      {
        q: "The app is running slowly. What should I do?",
        a: "Try clearing your cache in Settings > Clear Cache. Ensure you're using the latest version of StreamRate by checking for updates. If the issue persists, try restarting the app or your device. For ongoing performance issues, please contact our support team."
      },
      {
        q: "I found a bug. How do I report it?",
        a: "We appreciate bug reports! Go to Settings > Report a Problem, select 'Bug' as the problem type, and provide detailed information about what happened, including steps to reproduce the issue. You can also email us directly at " + CONTACT_EMAIL + " with screenshots or recordings."
      },
      {
        q: "How do I contact support?",
        a: "For any questions, concerns, or feedback, you can reach our support team at " + CONTACT_EMAIL + ". We aim to respond to all inquiries within 24-48 hours. For urgent matters, please include 'URGENT' in your subject line."
      },
    ]
  }
];

export const HelpFAQModal = ({ onClose }: HelpFAQModalProps) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>("Getting Started");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-2xl bg-card rounded-3xl border border-border shadow-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">Help & FAQ</h2>
            <p className="text-xs text-muted-foreground mt-1">Find answers to common questions</p>
          </div>
          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Contact */}
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Need more help?</p>
                <p className="text-sm text-muted-foreground">
                  Contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>
                </p>
              </div>
            </div>
          </div>

          {/* FAQ Categories */}
          <Accordion type="single" collapsible value={expandedCategory || undefined} onValueChange={(v) => setExpandedCategory(v)}>
            {FAQ_CATEGORIES.map((category) => (
              <AccordionItem key={category.title} value={category.title} className="border-border">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <category.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-semibold text-foreground">{category.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pl-11">
                    {category.faqs.map((faq, index) => (
                      <div key={index} className="p-4 bg-secondary/50 rounded-xl">
                        <p className="font-medium text-foreground mb-2">{faq.q}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* App Info */}
          <div className="pt-4 border-t border-border">
            <p className="text-center text-xs text-muted-foreground">
              StreamRate v1.0.0 • © 2025 StreamRate. All rights reserved.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
