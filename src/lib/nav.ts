export interface NavItem {
  label: string;
  href: string;
  description?: string;
}

export const mainNav: NavItem[] = [
  { label: "Products", href: "/products", description: "The full Humuson range" },
  { label: "Crops", href: "/crops", description: "Guidance by crop" },
  { label: "Product Finder", href: "/product-finder", description: "Find your solution" },
  { label: "Knowledge", href: "/knowledge", description: "Agronomy articles & guides" },
  { label: "Catalogue", href: "/catalogue", description: "Interactive product catalogue" },
  { label: "About", href: "/about", description: "Who we are" },
];

export const secondaryNav: NavItem[] = [
  { label: "Solutions", href: "/solutions" },
  { label: "Videos", href: "/videos" },
  { label: "Results", href: "/projects" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

export const footerNav: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Products",
    items: [
      { label: "All products", href: "/products" },
      { label: "Product finder", href: "/product-finder" },
      { label: "Interactive catalogue", href: "/catalogue" },
      { label: "Solutions", href: "/solutions" },
    ],
  },
  {
    heading: "Learn",
    items: [
      { label: "Knowledge centre", href: "/knowledge" },
      { label: "Crops", href: "/crops" },
      { label: "Videos", href: "/videos" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    heading: "Company",
    items: [
      { label: "About us", href: "/about" },
      { label: "Results & projects", href: "/projects" },
      { label: "Contact", href: "/contact" },
    ],
  },
];
