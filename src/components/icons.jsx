/** Small stroke icon set (24px grid). Decorative: always aria-hidden, the text next to them carries the meaning. */
const paths = {
  route: "M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm14-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7 17h6a3 3 0 0 0 0-6h-2a3 3 0 0 1 0-6h6",
  chat: "M4 5h16v11H9l-5 4V5Zm4 4h8M8 12h5",
  ticket: "M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4V8Zm10-2v12",
  check: "m5 12 4.5 4.5L19 7",
  shield: "M12 3 5 6v6c0 4.2 2.8 7.4 7 9 4.2-1.6 7-4.8 7-9V6l-7-3Zm-3 9 2.2 2.2L15.5 10",
  refund: "M4 12a8 8 0 1 0 3-6.2M4 4v4h4m4-1v5l3 2",
  headset: "M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v5H4v-5Zm13 0h3v5h-3v-5Zm0 5c0 1.5-1.5 2-4 2",
  seat: "M7 4h6a2 2 0 0 1 2 2v7H7V4Zm-2 9h12v3H5v-3Zm2 3v4m8-4v4",
  box: "M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Zm0 0 9 4.5m0 0 9-4.5M12 12v9",
  snow: "M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9 4.5l3 2.5 3-2.5M9 19.5l3-2.5 3 2.5",
  curtain: "M4 4h16M5 4v16m14-16v16M5 20c3 0 4-8 7-8s4 8 7 8M12 4v8",
  bag: "M7 8h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Zm3-3a2 2 0 0 1 4 0v3M9 13v3m6-3v3",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 1a2.5 2.5 0 1 0 0-5M3 19c0-3.3 2.7-5 6-5s6 1.7 6 5M16 14.5c2.8.2 5 1.7 5 4.5",
  pin: "M12 21s6-5.6 6-10.5a6 6 0 1 0-12 0C6 15.4 12 21 12 21Zm0-8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5",
};

export function Icon({ name, className = "h-6 w-6" }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={paths[name]} />
    </svg>
  );
}
