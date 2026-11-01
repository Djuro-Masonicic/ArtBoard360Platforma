import { PrijavaEntryOptions } from "@/components/prijava-entry-options";
import { PrijavaForm } from "@/components/prijava-form";
import styles from "@/components/prijava-page.module.css";

interface DisciplineOption {
  id: string;
  name: string;
  slug: string;
}

interface PrijavaFlowProps {
  disciplines: DisciplineOption[];
}

export function PrijavaFlow({ disciplines }: PrijavaFlowProps) {
  return (
    <>
      <PrijavaEntryOptions />
      <div className={styles.form} id="prijava-form">
        <PrijavaForm disciplines={disciplines} />
      </div>
    </>
  );
}
