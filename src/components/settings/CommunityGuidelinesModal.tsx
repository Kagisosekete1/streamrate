import { motion } from "framer-motion";
import { 
  X, 
  Heart, 
  Shield, 
  MessageCircle, 
  Star, 
  Ban, 
  AlertTriangle,
  Users,
  ThumbsUp,
  Eye,
  Scale,
  Sparkles
} from "lucide-react";

interface CommunityGuidelinesModalProps {
  onClose: () => void;
}

const CONTACT_EMAIL = "seketefilmstv@gmail.com";

const GUIDELINES = [
  {
    icon: Heart,
    title: "Be Respectful & Kind",
    description: "Treat every member of our community with respect and dignity. We celebrate diversity and encourage positive interactions.",
    details: [
      "Use welcoming and inclusive language in all interactions",
      "Respect different opinions, viewpoints, and experiences",
      "Engage in constructive conversations, even when you disagree",
      "Celebrate the success of others in the community",
      "Remember there's a real person behind every profile"
    ]
  },
  {
    icon: Ban,
    title: "Zero Tolerance for Hate",
    description: "Hate speech, discrimination, and harassment have no place on StreamRate. We are committed to maintaining a safe space for everyone.",
    details: [
      "No content that promotes hatred based on race, ethnicity, religion, gender, sexual orientation, disability, or nationality",
      "Slurs, derogatory language, and harmful stereotypes are prohibited",
      "Content designed to dehumanize or demean groups or individuals will be removed",
      "Accounts engaging in hate speech may be permanently banned without warning"
    ]
  },
  {
    icon: Shield,
    title: "No Harassment or Bullying",
    description: "Everyone deserves to feel safe on StreamRate. Harassment, bullying, and intimidation are strictly prohibited.",
    details: [
      "Do not target individuals with repeated unwanted contact or mentions",
      "Avoid posting content intended to shame, embarrass, or humiliate others",
      "Threats of any kind, including threats of violence, are not tolerated",
      "Doxxing (sharing personal information) is strictly forbidden",
      "Coordinated attacks against users will result in immediate action"
    ]
  },
  {
    icon: Star,
    title: "Authentic Ratings & Reviews",
    description: "Our rating system is built on trust and authenticity. Honest ratings help the community thrive.",
    details: [
      "Base your ratings on genuine experience with the streamer's content",
      "Do not create fake accounts to manipulate ratings",
      "Avoid rating bombing or coordinated rating manipulation",
      "Reviews should be constructive and based on actual observations",
      "Exchanging ratings for money, goods, or services is prohibited"
    ]
  },
  {
    icon: Users,
    title: "No Impersonation or Fraud",
    description: "Be yourself. Impersonating others undermines community trust and is not permitted.",
    details: [
      "Do not pretend to be another person, brand, or organization",
      "Parody and fan accounts must be clearly labeled as such",
      "Using someone else's photos or content as your own is prohibited",
      "Misleading usernames designed to deceive are not allowed",
      "Scams, fraud, and deceptive practices will result in permanent bans"
    ]
  },
  {
    icon: Eye,
    title: "Appropriate Content Only",
    description: "Keep content suitable for a diverse, global audience. Explicit and harmful content is not permitted.",
    details: [
      "No sexually explicit or pornographic content",
      "Graphic violence, gore, or disturbing imagery is prohibited",
      "Content promoting self-harm, eating disorders, or suicide is not allowed",
      "Drug use promotion or sales are strictly forbidden",
      "Illegal activities and content are immediately removed"
    ]
  },
  {
    icon: MessageCircle,
    title: "Spam-Free Environment",
    description: "Quality over quantity. We maintain a spam-free environment for genuine engagement.",
    details: [
      "Do not post repetitive, identical, or low-quality content",
      "Avoid excessive self-promotion that doesn't add value",
      "Automated posting, bots, and scripts are not permitted",
      "Misleading clickbait titles and thumbnails are prohibited",
      "Unsolicited promotional messages in comments are spam"
    ]
  },
  {
    icon: Scale,
    title: "Respect Intellectual Property",
    description: "Honor the creative work of others. Only share content you have rights to use.",
    details: [
      "Do not post content you don't own or have permission to use",
      "Give proper credit when sharing others' work with permission",
      "Copyright infringement reports are taken seriously",
      "Respect trademarks and brand identities",
      "Music in reels must be from our licensed library or owned by you"
    ]
  }
];

const ENFORCEMENT = [
  {
    level: "Warning",
    description: "First-time minor violations may result in a warning and content removal."
  },
  {
    level: "Temporary Suspension",
    description: "Repeated or moderate violations may result in temporary account suspension."
  },
  {
    level: "Permanent Ban",
    description: "Severe violations or continued misconduct will result in permanent account termination."
  }
];

export const CommunityGuidelinesModal = ({ onClose }: CommunityGuidelinesModalProps) => {
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
            <h2 className="text-xl font-bold text-foreground">Community Guidelines</h2>
            <p className="text-xs text-muted-foreground mt-1">Building a safe, inclusive community</p>
          </div>
          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Introduction */}
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
            <div className="flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground mb-2">Welcome to StreamRate</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Our community guidelines exist to ensure StreamRate remains a positive, safe, and 
                  welcoming space for all users. By using StreamRate, you agree to follow these guidelines. 
                  We encourage everyone to help us build a community where creators and fans can connect authentically.
                </p>
              </div>
            </div>
          </div>

          {/* Guidelines */}
          <div className="space-y-4">
            {GUIDELINES.map((guideline, index) => (
              <div key={index} className="p-4 bg-secondary/50 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <guideline.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{guideline.title}</h3>
                    <p className="text-sm text-muted-foreground">{guideline.description}</p>
                  </div>
                </div>
                <ul className="space-y-2 ml-13 pl-10">
                  {guideline.details.map((detail, detailIndex) => (
                    <li key={detailIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1.5">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Enforcement */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Enforcement Actions
            </h3>
            <p className="text-sm text-muted-foreground">
              We take violations seriously and enforce these guidelines consistently. Actions depend on severity and history:
            </p>
            <div className="space-y-2">
              {ENFORCEMENT.map((action, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    action.level === "Warning" ? "bg-amber-500" : 
                    action.level === "Temporary Suspension" ? "bg-orange-500" : 
                    "bg-destructive"
                  }`} />
                  <div>
                    <p className={`font-medium ${
                      action.level === "Warning" ? "text-amber-500" : 
                      action.level === "Temporary Suspension" ? "text-orange-500" : 
                      "text-destructive"
                    }`}>{action.level}</p>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reporting */}
          <div className="p-4 bg-secondary/50 rounded-xl">
            <h3 className="font-semibold text-foreground mb-2">Report Violations</h3>
            <p className="text-sm text-muted-foreground mb-3">
              If you encounter content or behavior that violates these guidelines, please report it immediately. 
              You can report directly through the app by tapping the three-dot menu on any post, reel, or profile. 
              For urgent matters, contact us at:
            </p>
            <a 
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary hover:underline font-medium"
            >
              {CONTACT_EMAIL}
            </a>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-border">
            <p className="text-center text-xs text-muted-foreground">
              Last updated: January 2025 • These guidelines may be updated periodically. 
              Continued use of StreamRate constitutes acceptance of the current guidelines.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
