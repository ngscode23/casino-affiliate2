'use client';

import Button from "@ui/components/common/button";
import { generateSectionId, type ProductTechSpecs } from "@/lib/catalog/product-tech-specs";

type ModelSpecsEditorProps = {
  value: ProductTechSpecs;
  onChange: (next: ProductTechSpecs) => void;
};

function createSectionLabel(index: number): string {
  return `Section ${index + 1}`;
}

export default function ModelSpecsEditor({ value, onChange }: ModelSpecsEditorProps) {
  const sections = Array.isArray(value.sections) ? value.sections : [];

  const updateSections = (updater: (prev: ProductTechSpecs["sections"]) => ProductTechSpecs["sections"]) => {
    onChange({
      ...value,
      sections: updater(sections),
    });
  };

  const updateSectionField = (index: number, field: "title" | "id", nextValue: string) => {
    updateSections((prev) =>
      prev.map((section, idx) =>
        idx === index
          ? {
              ...section,
              [field]: nextValue,
            }
          : section,
      ),
    );
  };

  const updateRowField = (sectionIndex: number, rowIndex: number, field: "name" | "value", nextValue: string) => {
    updateSections((prev) =>
      prev.map((section, idx) => {
        if (idx !== sectionIndex) return section;
        const rows = section.rows ?? [];
        return {
          ...section,
          rows: rows.map((row, rIdx) => (rIdx === rowIndex ? { ...row, [field]: nextValue } : row)),
        };
      }),
    );
  };

  const addSection = () => {
    updateSections((prev) => [
      ...prev,
      {
        id: generateSectionId(createSectionLabel(prev.length)),
        title: createSectionLabel(prev.length),
        rows: [{ name: "", value: "" }],
      },
    ]);
  };

  const removeSection = (index: number) => {
    updateSections((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addRow = (index: number) => {
    updateSections((prev) =>
      prev.map((section, idx) =>
        idx === index ? { ...section, rows: [...section.rows, { name: "", value: "" }] } : section,
      ),
    );
  };

  const removeRow = (sectionIndex: number, rowIndex: number) => {
    updateSections((prev) =>
      prev.map((section, idx) => {
        if (idx !== sectionIndex) return section;
        return {
          ...section,
          rows: section.rows.filter((_, rIdx) => rIdx !== rowIndex),
        };
      }),
    );
  };

  return (
    <div className="rounded-xl border border-admin-border bg-admin-surfaceMuted/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-admin-text">Technical specs</h3>
          <p className="text-xs text-admin-textSubtle">
            These sections feed the “Технические характеристики” block on the product page.
          </p>
        </div>
        <Button type="button" variant="neutral" onClick={addSection}>
          Add section
        </Button>
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.24em] text-admin-textSoft">Block title</label>
          <input
            type="text"
            className="rounded-xl border border-admin-border bg-white px-4 py-2 text-sm text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
            value={value.title ?? ""}
            onChange={(event) => onChange({ ...value, title: event.target.value })}
            placeholder="Технические характеристики"
          />
        </div>

        {sections.length === 0 ? (
          <p className="text-sm text-admin-textSubtle">No sections yet. Add one to start describing the model.</p>
        ) : (
          sections.map((section, index) => (
            <article key={section.id || index} className="space-y-4 rounded-xl border border-admin-border bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase tracking-[0.24em] text-admin-textSoft">
                      Section title
                    </label>
                    <input
                      type="text"
                      className="rounded-xl border border-admin-border bg-white px-3 py-2 text-sm text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                      value={section.title}
                      onChange={(event) => updateSectionField(index, "title", event.target.value)}
                      placeholder={createSectionLabel(index)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold uppercase tracking-[0.24em] text-admin-textSoft">
                      Section ID
                    </label>
                    <input
                      type="text"
                      className="rounded-xl border border-admin-border bg-white px-3 py-2 text-sm text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                      value={section.id}
                      onChange={(event) => updateSectionField(index, "id", event.target.value)}
                      placeholder="section-main"
                    />
                  </div>
                </div>
                <Button type="button" variant="soft" className="text-rose-600" onClick={() => removeSection(index)}>
                  Remove
                </Button>
              </div>

              <div className="space-y-3">
                {section.rows.map((row, rowIndex) => (
                  <div
                    key={`${section.id}-${rowIndex}`}
                    className="rounded-xl border border-admin-border/80 bg-admin-surface px-3 py-3"
                  >
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <input
                        type="text"
                        className="rounded-lg border border-admin-border bg-white px-3 py-2 text-sm text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                        placeholder="Parameter"
                        value={row.name}
                        onChange={(event) => updateRowField(index, rowIndex, "name", event.target.value)}
                      />
                      <input
                        type="text"
                        className="rounded-lg border border-admin-border bg-white px-3 py-2 text-sm text-admin-text shadow-sm focus:border-admin-primary focus:outline-none"
                        placeholder="Value"
                        value={row.value}
                        onChange={(event) => updateRowField(index, rowIndex, "value", event.target.value)}
                      />
                      <Button
                        type="button"
                        variant="soft"
                        className="min-h-0 px-3 py-2 text-sm text-rose-600 hover:text-rose-700"
                        onClick={() => removeRow(index, rowIndex)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="secondary" onClick={() => addRow(index)}>
                  Add parameter
                </Button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
