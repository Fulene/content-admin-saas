"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Loader2, Plus, X } from "lucide-react";
import type { CreatableDropdownOption } from "@/components/forms/creatable-dropdown";

export function CreatableChipCombobox({
  createLabel,
  disabled = false,
  emptyLabel = "Aucun element disponible.",
  label,
  onChange,
  onCreate,
  onCreateError,
  options,
  placeholder = "Taper pour rechercher ou créer",
  value,
}: {
  createLabel?: string;
  disabled?: boolean;
  emptyLabel?: string;
  label: string;
  onChange: (value: string[]) => void;
  onCreate?: (label: string) => Promise<CreatableDropdownOption>;
  onCreateError?: (message: string) => void;
  options: CreatableDropdownOption[];
  placeholder?: string;
  value: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const normalizedInputValue = normalizeOptionLabel(inputValue);
  const selectedOptions = value
    .map((id) => options.find((option) => option.id === id))
    .filter((option): option is CreatableDropdownOption => Boolean(option));
  const availableOptions = options.filter((option) => !value.includes(option.id));
  const filteredOptions = useMemo(
    () =>
      normalizedInputValue
        ? availableOptions.filter((option) =>
            normalizeOptionLabel(option.label).includes(normalizedInputValue),
          )
        : availableOptions,
    [availableOptions, normalizedInputValue],
  );
  const hasExactMatch = options.some(
    (option) => normalizeOptionLabel(option.label) === normalizedInputValue,
  );
  const canCreate =
    Boolean(onCreate) && inputValue.trim().length > 0 && !hasExactMatch;

  async function handleCreate() {
    if (!onCreate || !canCreate || isCreating) {
      return;
    }

    setIsCreating(true);

    try {
      const createdOption = await onCreate(inputValue.trim());
      onChange([...value, createdOption.id]);
      setInputValue("");
      setIsOpen(true);
    } catch (error) {
      onCreateError?.(
        error instanceof Error
          ? error.message
          : "Impossible de créer cet élément.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="grid gap-2">
      <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
        {label}
      </span>
      <div
        className="relative"
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
      >
        <div
          className={[
            "flex min-h-11 w-full flex-wrap items-center gap-2 rounded-lg border bg-white py-1.5 pl-2 pr-20 text-sm shadow-sm transition-colors dark:bg-[#111213]",
            isOpen
              ? "border-[#f44336] dark:border-[#ff8a3d]"
              : "border-stone-200 hover:bg-stone-50 dark:border-[#2d2e30] dark:hover:bg-[#18191b]",
            disabled ? "opacity-60" : "",
          ].join(" ")}
        >
          {selectedOptions.map((option) => (
            <span
              key={option.id}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#ffc2b8] bg-[#ffe7e2] px-3 text-sm font-semibold text-[#9f2119] dark:border-[#7a3329] dark:bg-[#3a211c] dark:text-[#ffb199]"
            >
              <span className="block h-8 leading-8">
                {option.label}
              </span>
              <button
                type="button"
                disabled={disabled}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() =>
                  onChange(value.filter((selectedId) => selectedId !== option.id))
                }
                className="inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#9f2119]/70 hover:bg-[#ffc2b8] hover:text-[#7f1d1d] disabled:cursor-default dark:text-[#ffb199]/75 dark:hover:bg-[#5a2a22] dark:hover:text-[#ffd2c3]"
                aria-label={`Retirer ${option.label}`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={inputValue}
            disabled={disabled}
            onFocus={() => setIsOpen(true)}
            onChange={(event) => {
              setInputValue(event.target.value);
              setIsOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (canCreate) {
                  void handleCreate();
                }
              }

              if (
                event.key === "Backspace" &&
                inputValue.length === 0 &&
                value.length > 0
              ) {
                onChange(value.slice(0, -1));
              }
            }}
            placeholder={selectedOptions.length === 0 ? placeholder : ""}
            className="min-w-36 flex-1 bg-transparent px-1 text-sm font-medium text-stone-950 outline-none placeholder:text-stone-400 disabled:cursor-default dark:text-white dark:placeholder:text-stone-500"
          />
        </div>

        {canCreate ? (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleCreate}
            disabled={isCreating}
            className="absolute right-9 top-1.5 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#f44336] text-white transition-colors hover:bg-[#d7382d] disabled:cursor-default disabled:opacity-60 dark:bg-[#ff8a3d] dark:text-stone-950 dark:hover:bg-[#ff7920]"
            aria-label={`${createLabel ?? "Creer"} ${inputValue.trim()}`}
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        ) : null}

        <button
          type="button"
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setIsOpen((value) => !value)}
          className="absolute right-0 top-0 flex h-11 w-9 cursor-pointer items-center justify-center disabled:cursor-default"
          aria-label={isOpen ? "Fermer la liste" : "Ouvrir la liste"}
        >
          <ChevronDown
            className={[
              "h-4 w-4 text-stone-500 transition-transform duration-200 dark:text-stone-400",
              isOpen ? "rotate-180" : "",
            ].join(" ")}
            aria-hidden="true"
          />
        </button>

        {isOpen ? (
          <div
            className="absolute left-0 top-12 z-50 w-full overflow-hidden rounded-lg border border-stone-200 bg-white p-1 shadow-xl dark:border-[#2d2e30] dark:bg-[#141517]"
            role="listbox"
          >
            <div className="max-h-56 overflow-y-auto px-1 pb-1">
              {filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange([...value, option.id]);
                    setInputValue("");
                    setIsOpen(true);
                  }}
                  className="flex w-full cursor-pointer items-center rounded-md px-3 py-2 text-left text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-[#18191b] dark:hover:text-white"
                  role="option"
                  aria-selected={false}
                >
                  <span className="truncate">{option.label}</span>
                </button>
              ))}
              {filteredOptions.length === 0 ? (
                <p className="px-3 py-2 text-sm text-stone-500 dark:text-stone-400">
                  {emptyLabel}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function normalizeOptionLabel(value: string) {
  return value.trim().toLowerCase();
}
