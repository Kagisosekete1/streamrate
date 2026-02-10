import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import despia from "despia-native";

const dadJokes = [
  "Why don't scientists trust atoms? Because they make up everything!",
  "I'm reading a book about anti-gravity. It's impossible to put down!",
  "Why did the scarecrow win an award? He was outstanding in his field!",
  "I told my wife she was drawing her eyebrows too high. She looked surprised.",
  "What do you call a fake noodle? An impasta!",
  "Why don't eggs tell jokes? They'd crack each other up!",
  "I used to hate facial hair, but then it grew on me.",
  "What did the ocean say to the beach? Nothing, it just waved.",
  "Why do cows have hooves instead of feet? Because they lactose.",
  "What do you call a belt made of watches? A waist of time!",
  "I'm afraid for the calendar. Its days are numbered.",
  "Why did the math book look so sad? Because it had too many problems.",
  "What do you call a dog that does magic tricks? A Labracadabrador!",
  "I only know 25 letters of the alphabet. I don't know y.",
  "Did you hear about the claustrophobic astronaut? He just needed a little space.",
];

export const DadJokeNotification = () => {
  const { toast } = useToast();

  const scheduleJoke = () => {
    const joke = dadJokes[Math.floor(Math.random() * dadJokes.length)];
    const seconds = 5;
    const title = "Dad Joke Incoming 😂";
    const url = window.location.href;

    despia(
      `sendlocalpushmsg://push.send?s=${seconds}=msg!${joke}&!#${title}&!#${url}`
    );

    toast({
      title: "Notification scheduled!",
      description: "A dad joke is coming your way in 5 seconds 😄",
    });
  };

  return (
    <Button
      onClick={scheduleJoke}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Bell className="w-4 h-4" />
      Dad Joke in 5s
    </Button>
  );
};
