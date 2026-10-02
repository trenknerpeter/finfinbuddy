import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const LANGS = ["en", "cs"] as const;
export type Lang = (typeof LANGS)[number];
const isLang = (v: unknown): v is Lang => LANGS.includes(v as Lang);
const STORAGE_KEY = "finbuddy.lang";

/** English source text (with {placeholders}) → Czech. Missing keys fall back to English. */
const CS: Record<string, string> = {
  // Shell
  Currency: "Měna",
  Language: "Jazyk",
  Invest: "Investice",
  Mortgage: "Hypotéka",
  Plan: "Plán",
  Dashboard: "Přehled",
  Soon: "Brzy",
  "Copy link": "Kopírovat odkaz",
  Copied: "Zkopírováno",
  // Shared
  years: "let",
  year: "rok",
  Year: "Rok",
  "Year {n}": "Rok {n}",
  "Year by year": "Rok po roce",
  Growth: "Zhodnocení",
  "Money you put in": "Vaše vklady",
  Contributed: "Vloženo",
  Total: "Celkem",
  "Total contributed": "Vloženo celkem",
  Balance: "Zůstatek",
  "Expected annual return": "Očekávaný roční výnos",
  Inflation: "Inflace",
  // Invest
  "Initial amount": "Počáteční vklad",
  "Monthly contribution": "Měsíční příspěvek",
  "Investment period": "Investiční horizont",
  "Show in today's money": "Zobrazit v dnešních cenách",
  "Inflation rate": "Míra inflace",
  "Investment projection": "Projekce investice",
  "{years} at {rate} a year, compounded monthly.": "{years} při {rate} ročně, s měsíčním úročením.",
  "Set an investment period of at least one year to see a projection.":
    "Nastavte investiční horizont alespoň na jeden rok, abyste viděli projekci.",
  "Final value": "Konečná hodnota",
  "Total growth": "Celkové zhodnocení",
  "{p}% of the final value": "{p} % konečné hodnoty",
  "In today's money": "V dnešních cenách",
  "At {p} inflation": "Při inflaci {p}",
  "Growth over time": "Vývoj v čase",
  "What it pays you": "Pasivní příjem",
  "Once the {years} are up, this is what you could take out each year without touching the rest.":
    "Po uplynutí {years} si můžete každý rok vybírat tuto částku, aniž byste sáhli na zbytek.",
  "Invested amount": "Investovaná částka",
  "Withdrawal rate": "Míra výběru",
  "Per month": "Měsíčně",
  "Per year": "Ročně",
  "{p} a year, split over 12 months": "{p} ročně, rozděleno do 12 měsíců",
  "{v} in today's money": "{v} v dnešních cenách",
  "{v} stays invested": "{v} zůstává investováno",
  "Assumes the pot keeps earning at least the rate you take out, so the balance holds steady. Take out more than it earns and it will shrink over time.":
    "Předpokládá, že portfolio vydělává alespoň tolik, kolik vybíráte, takže zůstatek zůstává stejný. Pokud vyberete víc, než vydělá, bude se postupně zmenšovat.",
  // Mortgage
  "Solve for": "Dopočítat",
  "Monthly payment": "Měsíční splátka",
  "Remaining term": "Zbývající doba splácení",
  'Enter what you know. If the payment we calculate doesn\'t match your real one, switch to "Remaining term" and enter your actual payment instead.':
    "Zadejte, co víte. Pokud vypočtená splátka neodpovídá té skutečné, přepněte na „Zbývající doba splácení“ a zadejte svou skutečnou splátku.",
  "Remaining principal": "Zbývající jistina",
  "Current interest rate": "Aktuální úroková sazba",
  "Current monthly payment": "Aktuální měsíční splátka",
  "Compare another rate": "Porovnat jinou sazbu",
  "Compare another interest rate": "Porovnat jinou úrokovou sazbu",
  "New interest rate": "Nová úroková sazba",
  "Extra one-time payment": "Mimořádná jednorázová splátka",
  "Extra payment amount": "Výše mimořádné splátky",
  "Paid in year": "Zaplaceno v roce",
  "Rate change impact": "Dopad změny sazby",
  "{v} left": "Zbývá {v}",
  " over {years}": " na {years}",
  "That payment doesn't cover the monthly interest — the balance would never go down.":
    "Tato splátka nepokryje ani měsíční úrok — dluh by se nikdy nesnižoval.",
  "Enter a remaining term and principal to compare rates.":
    "Zadejte zbývající dobu splácení a jistinu pro porovnání sazeb.",
  "Current vs what-if": "Nyní vs. scénář",
  "Now · {p}": "Nyní · {p}",
  "What-if · {p}": "Scénář · {p}",
  "Total interest": "Úroky celkem",
  "Total paid": "Zaplaceno celkem",
  "Assumes the same remaining term — the monthly payment absorbs the rate change.":
    "Předpokládá stejnou zbývající dobu — změnu sazby promítne měsíční splátka.",
  "Your mortgage": "Vaše hypotéka",
  "Payments over time": "Splátky v čase",
  Principal: "Jistina",
  Interest: "Úrok",
  "Impact of the extra payment": "Dopad mimořádné splátky",
  "Interest saved": "Ušetřeno na úrocích",
  "Paid off earlier by": "Splaceno dříve o",
  "New total interest": "Nové úroky celkem",
  "A one-time payment of {v} in year {y}, keeping the same monthly payment.":
    "Jednorázová splátka {v} v roce {y}, se stejnou měsíční splátkou.",
  "Remaining balance over time": "Zbývající dluh v čase",
  Now: "Nyní",
  "What-if": "Scénář",
  Current: "Nyní",
  "Total interest, compared": "Úroky celkem — porovnání",
  "Interest paid": "Zaplacené úroky",
  "Principal paid": "Splacená jistina",
  "Remaining balance": "Zbývající dluh",
  "{y}y {m}m": "{y} r. {m} m.",
  "{m}m": "{m} m.",
  // Plan questionnaire
  "How old are you?": "Kolik je vám let?",
  "Your current age sets how long your money has to grow.":
    "Váš současný věk určuje, jak dlouho mohou peníze růst.",
  "Use your age today, rounded to the nearest whole year.":
    "Zadejte svůj dnešní věk, zaokrouhlený na celé roky.",
  "At what age would you like to stop working?": "V kolika letech byste chtěli přestat pracovat?",
  "Aiming early is fine — that's the point of working it out.":
    "Klidně miřte brzy — právě proto si to propočítáváme.",
  "This is your target, not a commitment. You can test other ages in your results.":
    "Je to váš cíl, ne závazek. Jiný věk si můžete vyzkoušet ve výsledcích.",
  "How much would you need each month to live on?": "Kolik byste měsíčně potřebovali na život?",
  "In today's money — what your life costs now is usually a good guide.":
    "V dnešních cenách — dobrým vodítkem je, kolik vás život stojí teď.",
  "Include regular living costs and room for the lifestyle you want. Leave out savings contributions.":
    "Zahrňte běžné životní náklady a rezervu na životní styl, jaký chcete. Spoření nezapočítávejte.",
  "How much do you have saved or invested today?": "Kolik máte dnes naspořeno nebo investováno?",
  "Everything you'd count towards this: investments, savings, pension pots.":
    "Vše, co byste sem započítali: investice, úspory, penzijní spoření.",
  "Use money intended for your future. Avoid counting your home unless you plan to sell it.":
    "Počítejte peníze určené pro vaši budoucnost. Vlastní bydlení nezapočítávejte, pokud ho neplánujete prodat.",
  "How much do you put aside each month?": "Kolik měsíčně odkládáte stranou?",
  "Whatever you're actually managing right now, not the aspiration.":
    "Kolik skutečně odkládáte teď, ne kolik byste chtěli.",
  "Include regular investing and pension contributions that will continue until your target age.":
    "Zahrňte pravidelné investice a penzijní příspěvky, které budou pokračovat až do cílového věku.",
  "Enter a number to continue.": "Pro pokračování zadejte číslo.",
  "Between {min} and {max}, please.": "Zadejte prosím hodnotu mezi {min} a {max}.",
  "It has to be above your current age — otherwise you'd already be there.":
    "Musí být vyšší než váš současný věk — jinak byste už v cíli byli.",
  Back: "Zpět",
  "See my plan": "Zobrazit můj plán",
  Continue: "Pokračovat",
  "Skip for now": "Zatím přeskočit",
  // Plan results
  Closed: "Uzavřeno",
  "Now: {v}": "Nyní: {v}",
  "This one can't close the gap on its own.": "Tato páka sama mezeru neuzavře.",
  "This alone closes the gap.": "Tohle samo mezeru uzavře.",
  "What this alone would have to be": "Kolik by to samo muselo být",
  "You could stop working now.": "Pracovat byste mohli přestat už teď.",
  "On this path, you don't reach your number.": "Touto cestou cílové částky nedosáhnete.",
  "You can stop working at {age} — {years} early.":
    "Pracovat můžete přestat v {age} letech — o {years} dříve.",
  "That's ahead of your target of {stop}. Keep going until {stop} and you'd have about {v} more than your number.":
    "To je dříve než váš cíl {stop} let. Pokud vydržíte do {stop}, budete mít zhruba o {v} víc, než potřebujete.",
  "You're on track to stop working at {stop}.": "Jste na dobré cestě přestat pracovat v {stop} letech.",
  "At this rate, you can stop working at {age}.": "Tímto tempem můžete přestat pracovat v {age} letech.",
  "{years} later than your target of {stop}. At {stop} you'd have about {v} — around {gap} short.":
    "O {years} později než váš cíl {stop} let. V {stop} letech byste měli zhruba {v} — chybělo by asi {gap}.",
  "Save as PDF": "Uložit jako PDF",
  "Edit answers": "Upravit odpovědi",
  "Your target": "Cílová částka pro rentu",
  "{p} a year of it covers your yearly spending of {v} without touching the pot":
    "{p} ročně z ní pokryje vaše roční výdaje {v}, aniž byste sáhli na jistinu",
  "Projected at {stop}": "Odhad ve {stop} letech",
  "{v} a month at {p}, in today's money": "{v} měsíčně při {p}, v dnešních cenách",
  "The gap": "Mezera",
  Covered: "Pokryto",
  "You're ahead of your number": "Máte víc, než potřebujete",
  "What the projection is missing": "Kolik projekci chybí",
  "Getting there": "Cesta k cíli",
  "Four ways to close the gap": "Čtyři způsoby, jak mezeru uzavřít",
  "Reset levers": "Obnovit páky",
  "Save more each month": "Spořit více",
  "Work a bit longer": "Pracovat déle",
  "years old": "let",
  "Live on less": "Snížit výdaje",
  "{v}/mo": "{v}/měs.",
  "Higher returns": "Vyšší výnosy",
  "The one lever you don't control.": "Jediná páka, kterou nemáte pod kontrolou.",
  Assumptions: "Předpoklady",
  "All figures are in today's money.": "Všechny částky jsou v dnešních cenách.",
  "Safe withdrawal rate": "Bezpečná míra výběru",
  "Take out 4% of the pot in your first year and adjust for inflation after that, and the money has historically lasted 30 years or more. It's a rule of thumb, not a guarantee.":
    "Pokud v prvním roce vyberete 4 % portfolia a dále výběr navyšujete o inflaci, peníze historicky vydržely 30 let i déle. Je to orientační pravidlo, ne záruka.",
  "Your inputs": "Vaše údaje",
  Age: "Věk",
  "Age {n}": "Věk {n}",
  "Target age": "Cílový věk",
  "Target age {n}": "Cílový věk {n}",
  "Monthly spending": "Měsíční výdaje",
  "Saved today": "Naspořeno dnes",
  "Monthly saving": "Měsíční spoření",
  "Annual return": "Roční výnos",
  "All figures in today's money. Made with FinBuddy · {date}":
    "Všechny částky v dnešních cenách. Vytvořeno ve FinBuddy · {date}",
  "FinBuddy does arithmetic, not advice. These are projections based on assumptions you can change — not a prediction, and not a recommendation to buy or sell anything.":
    "FinBuddy počítá, neradí. Jde o projekce založené na předpokladech, které můžete měnit — nejde o předpověď ani o doporučení cokoli koupit či prodat.",
  Pot: "Portfolio",
  "Put in": "Vloženo",
  "Your number — {v}": "Cílová částka — {v}",
  "{n} — you reach your number": "{n} — dosáhnete cílové částky",
  // Dashboard
  "Coming soon": "Již brzy",
  "Upload your monthly bank statement and see where the money actually goes: income and spending by category, month over month.":
    "Nahrajte měsíční výpis z účtu a uvidíte, kam peníze skutečně odcházejí: příjmy a výdaje podle kategorií, měsíc po měsíci.",
};

type Vars = Record<string, string | number>;

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "en",
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLang(stored)) setLangState(stored);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  };
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

export const isLangValue = isLang;

export function useT() {
  const { lang } = useLang();
  const t = (key: string, vars?: Vars) => {
    let s = lang === "cs" ? (CS[key] ?? key) : key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
  };
  /** Count + unit with correct plural form. unit: "year" | "month". */
  const count = (n: number, unit: "year" | "month") => {
    const abs = Math.abs(n);
    if (lang === "cs") {
      const forms = unit === "year" ? ["rok", "roky", "let"] : ["měsíc", "měsíce", "měsíců"];
      const f = !Number.isInteger(n) ? (unit === "year" ? "roku" : "měsíce") : abs === 1 ? forms[0] : abs >= 2 && abs <= 4 ? forms[1] : forms[2];
      return `${String(n).replace(".", ",")} ${f}`;
    }
    return `${n} ${unit}${abs === 1 ? "" : "s"}`;
  };
  /** Czech accusative-ish "o X letech" variants aren't needed; use count(). */
  return { t, count, lang, locale: lang === "cs" ? "cs-CZ" : "en-GB" };
}
