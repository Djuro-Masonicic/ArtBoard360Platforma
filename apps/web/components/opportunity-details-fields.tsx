"use client";

import { useId } from "react";
import { ARTBOARD_DISCIPLINES } from "@/lib/artboard-disciplines";
import { OPPORTUNITY_COUNTRIES } from "@/lib/opportunity-countries";
import { compensationKindLabels, documentLabels, languageLabels, workModeLabels } from "@/lib/opportunity-presentation";
import type { Opportunity, OpportunityCompensationKind, OpportunityDetailsPayload, OpportunityWorkMode } from "@/services/opportunities";
import styles from "./opportunity-details-fields.module.css";

export type OpportunityDetailsFormValue = {
  workMode: OpportunityWorkMode | "";
  disciplines: string[];
  compensationKind: OpportunityCompensationKind | "";
  compensationAmount: string;
  compensationCurrency: string;
  applicationFee: string;
  maxAge: string;
  eligibleCountries: string[];
  applicationLanguages: string[];
  requiredDocuments: string;
  coveredCosts: string;
};

export function initialOpportunityDetails(item?: Opportunity): OpportunityDetailsFormValue {
  return {
    workMode: item?.workMode ?? "", disciplines: item?.disciplines ?? [],
    compensationKind: item?.compensationKind ?? "", compensationAmount: item?.compensationAmount ?? "",
    compensationCurrency: item?.compensationCurrency ?? "EUR", applicationFee: item?.applicationFee ?? "",
    maxAge: item?.maxAge?.toString() ?? "", eligibleCountries: item?.eligibleCountries ?? [],
    applicationLanguages: item?.applicationLanguages ?? [], requiredDocuments: item?.requiredDocuments?.map((name) => documentLabels[name] || name).join("\n") ?? "",
    coveredCosts: item?.coveredCosts?.join("\n") ?? "",
  };
}

export function opportunityDetailsPayload(value: OpportunityDetailsFormValue): OpportunityDetailsPayload {
  const lines = (text: string) => text.split("\n").map((line) => line.trim()).filter(Boolean);
  return {
    ...value,
    workMode: value.workMode || null, compensationKind: value.compensationKind || null,
    compensationAmount: value.compensationAmount === "" ? null : Number(value.compensationAmount),
    applicationFee: value.applicationFee === "" ? null : Number(value.applicationFee),
    maxAge: value.maxAge === "" ? null : Number(value.maxAge),
    requiredDocuments: lines(value.requiredDocuments), coveredCosts: lines(value.coveredCosts),
  };
}

export function OpportunityDetailsFields({ value, onChange }: { value: OpportunityDetailsFormValue; onChange: (value: OpportunityDetailsFormValue) => void }) {
  const id = useId();
  function update<K extends keyof OpportunityDetailsFormValue>(key: K, next: OpportunityDetailsFormValue[K]) { onChange({ ...value, [key]: next }); }
  return <div className={styles.fields}>
    <label>Način rada<select aria-label="Način rada" onChange={(event) => update("workMode", event.target.value as OpportunityWorkMode | "")} value={value.workMode}>
      <option value="">Nije navedeno</option>{Object.entries(workModeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select></label>
    <label>Vrsta naknade<select aria-label="Vrsta naknade" onChange={(event) => update("compensationKind", event.target.value as OpportunityCompensationKind | "")} value={value.compensationKind}>
      <option value="">Nije navedeno</option>{Object.entries(compensationKindLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
    </select></label>
    <label>Iznos naknade<input min="0" max="9999999999.99" step="0.01" type="number" onChange={(event) => update("compensationAmount", event.target.value)} placeholder="npr. 1500" value={value.compensationAmount} /></label>
    <label>Valuta<select aria-label="Valuta" onChange={(event) => update("compensationCurrency", event.target.value)} value={value.compensationCurrency}>
      {["EUR", "USD", "GBP", "BAM", "RSD", "CHF", "MKD", "ALL"].map((currency) => <option key={currency}>{currency}</option>)}
    </select></label>
    <label>Kotizacija<input min="0" max="9999999999.99" step="0.01" type="number" onChange={(event) => update("applicationFee", event.target.value)} placeholder="0 za prijavu bez kotizacije" value={value.applicationFee} /><small>Ostavi prazno ako kotizacija nije određena.</small></label>
    <label>Gornja starosna granica<input min="1" max="120" step="1" type="number" onChange={(event) => update("maxAge", event.target.value)} placeholder="npr. 35 — opciono" value={value.maxAge} /></label>
    <fieldset className={styles.full}><legend>Umjetničke discipline</legend><div className={styles.choices}>
      {ARTBOARD_DISCIPLINES.map(({ name }) => <label key={name}><input type="checkbox" checked={value.disciplines.includes(name)} onChange={(event) => update("disciplines", event.target.checked ? [...value.disciplines, name] : value.disciplines.filter((item) => item !== name))} /><span>{name}</span></label>)}
    </div></fieldset>
    <label htmlFor={`${id}-countries`}>Iz kojih država prihvataš prijave?<select aria-label="Iz kojih država prihvataš prijave?" id={`${id}-countries`} multiple size={4} value={value.eligibleCountries} onChange={(event) => update("eligibleCountries", Array.from(event.target.selectedOptions, (option) => option.value))}>
      {OPPORTUNITY_COUNTRIES.filter(({ code }) => code && code !== "REG").map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
    </select><small>Opciono. Moguće je izabrati više država.</small></label>
    <fieldset><legend>Jezici prijave</legend><div className={styles.choices}>
      {Object.entries(languageLabels).map(([code, name]) => <label key={code}><input type="checkbox" checked={value.applicationLanguages.includes(code)} onChange={(event) => update("applicationLanguages", event.target.checked ? [...value.applicationLanguages, code] : value.applicationLanguages.filter((item) => item !== code))} /><span>{name}</span></label>)}
    </div></fieldset>
    <label>Šta treba poslati?<textarea rows={4} placeholder={"Biografija / CV\nPortfolio (PDF)\nPrijedlog projekta"} value={value.requiredDocuments} onChange={(event) => update("requiredDocuments", event.target.value)} /><small>Svaki dokument unesi u poseban red.</small></label>
    <label>Koje troškove pokriva organizator?<textarea rows={4} placeholder={"Smještaj\nPutni troškovi\nProdukcija izložbe"} value={value.coveredCosts} onChange={(event) => update("coveredCosts", event.target.value)} /><small>Svaku stavku unesi u poseban red.</small></label>
  </div>;
}
