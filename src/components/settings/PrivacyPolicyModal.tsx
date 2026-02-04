import { motion } from "framer-motion";
import { 
  X, 
  Database, 
  Eye, 
  Shield, 
  Cookie, 
  Share2, 
  Lock, 
  UserCheck, 
  Globe, 
  Mail,
  FileText,
  Settings
} from "lucide-react";

interface PrivacyPolicyModalProps {
  onClose: () => void;
}

const CONTACT_EMAIL = "seketefilmstv@gmail.com";

const PRIVACY_SECTIONS = [
  {
    icon: Database,
    title: "Information We Collect",
    content: [
      {
        subtitle: "Information You Provide",
        text: "When you create an account, we collect your email address, username, password (securely encrypted), profile information (bio, profile picture, header image), and country/location. When you use StreamRate, we collect the content you create including posts, reels, comments, ratings, and reviews."
      },
      {
        subtitle: "Automatically Collected Information",
        text: "We automatically collect certain information when you use our services, including: device information (device type, operating system, unique device identifiers), usage data (features used, content viewed, time spent, interaction patterns), log data (IP address, browser type, access times, referring URLs), and location data (country/region based on IP address)."
      },
      {
        subtitle: "Information from Third Parties",
        text: "If you choose to link your StreamRate account with third-party services (such as social media platforms for login), we may receive information from those services as permitted by their privacy settings and your authorization."
      }
    ]
  },
  {
    icon: Eye,
    title: "How We Use Your Information",
    content: [
      {
        subtitle: "Providing Our Services",
        text: "We use your information to operate StreamRate, including: creating and managing your account, displaying your profile to other users, enabling you to create and share content, facilitating ratings, reviews, and interactions, personalizing your experience and content recommendations."
      },
      {
        subtitle: "Improving Our Services",
        text: "We analyze usage patterns to understand how our platform is used, identify and fix bugs or issues, develop new features and improvements, and ensure the security and integrity of our platform."
      },
      {
        subtitle: "Communications",
        text: "We may use your email to send: account-related notifications (password resets, security alerts), updates about new features or changes to our services, and promotional content (only with your consent, and you can opt out anytime)."
      }
    ]
  },
  {
    icon: Share2,
    title: "Information Sharing",
    content: [
      {
        subtitle: "Public Information",
        text: "Your profile information, posts, reels, ratings, and reviews are visible to other StreamRate users based on your privacy settings. Public profiles are visible to all users; private profiles are visible only to approved followers."
      },
      {
        subtitle: "We Do NOT Sell Your Data",
        text: "StreamRate does not sell, rent, or trade your personal information to third parties for their marketing purposes. Your data is not a product—you are our valued user, not our commodity."
      },
      {
        subtitle: "Service Providers",
        text: "We may share information with trusted third-party service providers who assist us in operating our platform, such as hosting services, analytics providers, and customer support tools. These providers are bound by strict confidentiality agreements."
      },
      {
        subtitle: "Legal Requirements",
        text: "We may disclose information if required by law, legal process, or government request, or if we believe disclosure is necessary to protect our rights, safety, or the safety of others, or to detect and prevent fraud or security issues."
      }
    ]
  },
  {
    icon: Lock,
    title: "Data Security",
    content: [
      {
        subtitle: "Security Measures",
        text: "We implement industry-standard security measures to protect your information, including: encryption of data in transit (HTTPS/TLS) and at rest, secure password hashing using modern algorithms, regular security audits and vulnerability assessments, access controls limiting employee access to user data, and secure cloud infrastructure with redundancy and backup systems."
      },
      {
        subtitle: "Your Role in Security",
        text: "You can help protect your account by: using a strong, unique password, enabling two-factor authentication when available, not sharing your login credentials, logging out on shared devices, and reporting suspicious activity immediately."
      }
    ]
  },
  {
    icon: UserCheck,
    title: "Your Rights & Choices",
    content: [
      {
        subtitle: "Access & Portability",
        text: "You have the right to access the personal information we hold about you. You can view and download much of this information directly from your account settings."
      },
      {
        subtitle: "Correction",
        text: "You can update or correct your profile information at any time through the app. If you believe we have inaccurate information that you cannot correct yourself, contact us."
      },
      {
        subtitle: "Deletion",
        text: "You can delete your account at any time through Settings > Delete Account. This will permanently remove your profile, posts, reels, and other content. Some information may be retained for legal or legitimate business purposes."
      },
      {
        subtitle: "Privacy Controls",
        text: "StreamRate provides granular privacy controls including: profile visibility (public/private), who can comment on your content, who can see your last seen status, blocked users management, and notification preferences."
      }
    ]
  },
  {
    icon: Cookie,
    title: "Cookies & Tracking",
    content: [
      {
        subtitle: "Essential Cookies",
        text: "We use essential cookies to maintain your session, remember your preferences, and ensure the security of your account. These are necessary for the platform to function properly."
      },
      {
        subtitle: "Analytics",
        text: "We use analytics tools to understand how our platform is used and to improve our services. This data is aggregated and does not personally identify you."
      },
      {
        subtitle: "Your Choices",
        text: "You can control cookies through your browser settings. Note that disabling essential cookies may affect your ability to use StreamRate properly."
      }
    ]
  },
  {
    icon: Globe,
    title: "International Data Transfers",
    content: [
      {
        subtitle: "Global Operations",
        text: "StreamRate operates globally, and your information may be processed in countries other than your own. We ensure appropriate safeguards are in place for international data transfers in compliance with applicable laws."
      },
      {
        subtitle: "Data Protection",
        text: "Regardless of where your data is processed, we apply the same privacy protections described in this policy. We comply with applicable data protection regulations including GDPR for users in the European Union."
      }
    ]
  },
  {
    icon: Settings,
    title: "Children's Privacy",
    content: [
      {
        subtitle: "Age Requirement",
        text: "StreamRate is not intended for children under 13 years of age (or the minimum age in your jurisdiction). We do not knowingly collect personal information from children under 13."
      },
      {
        subtitle: "Parental Notice",
        text: "If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately at " + CONTACT_EMAIL + ". We will take steps to delete such information."
      }
    ]
  }
];

export const PrivacyPolicyModal = ({ onClose }: PrivacyPolicyModalProps) => {
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
            <h2 className="text-xl font-bold text-foreground">Privacy Policy</h2>
            <p className="text-xs text-muted-foreground mt-1">How we protect your data</p>
          </div>
          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Introduction */}
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground mb-2">Your Privacy Matters</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  At StreamRate, we are committed to protecting your privacy and ensuring you understand 
                  how we collect, use, and safeguard your information. This Privacy Policy explains our 
                  practices and your rights regarding your personal data. By using StreamRate, you agree 
                  to the terms outlined in this policy.
                </p>
              </div>
            </div>
          </div>

          {/* Effective Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>Effective Date: January 1, 2025 • Last Updated: January 2025</span>
          </div>

          {/* Privacy Sections */}
          <div className="space-y-6">
            {PRIVACY_SECTIONS.map((section, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <section.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg text-foreground">{section.title}</h3>
                </div>
                
                <div className="space-y-4 pl-13 ml-5">
                  {section.content.map((item, itemIndex) => (
                    <div key={itemIndex} className="p-4 bg-secondary/50 rounded-xl">
                      <h4 className="font-medium text-foreground mb-2">{item.subtitle}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Contact Section */}
          <div className="p-4 bg-secondary/50 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <Mail className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Contact Us About Privacy</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our 
              data practices, please contact our Privacy Team:
            </p>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                <strong className="text-foreground">Email:</strong>{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Response Time:</strong> We aim to respond to all 
                privacy-related inquiries within 30 days.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-border">
            <p className="text-center text-xs text-muted-foreground">
              This Privacy Policy may be updated periodically. We will notify you of significant changes 
              via email or in-app notification. Continued use of StreamRate after changes constitutes 
              acceptance of the updated policy.
            </p>
            <p className="text-center text-xs text-muted-foreground mt-2">
              © 2025 StreamRate. All rights reserved.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
