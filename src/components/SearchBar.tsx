import { Search, Filter } from "lucide-react";
import { Input } from "./ui/input";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  showFilters?: boolean;
}

export const SearchBar = ({
  placeholder = "Search streamers...",
  onSearch,
  showFilters = true,
}: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filters = ["Most Rated", "Trending", "New", "Country"];

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch?.(value);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={placeholder}
            className="pl-10 pr-4 bg-secondary/80 border-border/50 focus:bg-secondary"
          />
        </div>
        
        {showFilters && (
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="h-11 w-11 flex items-center justify-center rounded-lg bg-secondary border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
          >
            <Filter className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showFilterMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 p-2 bg-card rounded-lg border border-border shadow-xl z-20"
          >
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(activeFilter === filter ? null : filter)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeFilter === filter
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
