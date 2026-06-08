"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ChevronDown, Loader2, Plus } from "lucide-react";

export type CreatableDropdownOption = {
  id: string;
  label: string;
  description?: string | null;
};

export function CreatableDropdown({
  createLabel,
  disabled = false,
  emptyLabel = "Aucun element disponible.",
  label,
  onChange,
  onCreate,
  onCreateError,
  options,
  placeholder = "",
  required = false,
  value,
}: {
  createLabel?: string;
  disabled?: boolean;
  emptyLabel?: string;
  label: string;
  onChange: (value: string | null) => void;
  onCreate?: (label: string) => Promise<CreatableDropdownOption>;
  onCreateError?: (message: string) => void;
  options: CreatableDropdownOption[];
  placeholder?: string;
  required?: boolean;
  value: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const inputId = useId();

  const activeOption = options.find((option) => option.id === value) ?? null;
  const normalizedInputValue = normalizeOptionLabel(inputValue);
  const isShowingActiveSelection =
    value !== null && inputValue === activeOption?.label;
  const normalizedFilterValue = isShowingActiveSelection
    ? ""
    : normalizedInputValue;
  const filteredOptions = useMemo(
    () =>
      normalizedFilterValue
        ? options.filter((option) =>
            normalizeOptionLabel(option.label).includes(normalizedFilterValue),
          )
        : options,
    [normalizedFilterValue, options],
  );
  const hasExactMatch = options.some(
    (option) => normalizeOptionLabel(option.label) === normalizedInputValue,
  );
  const canCreate =
    Boolean(onCreate) &&
    inputValue.trim().length > 0 &&
    !hasExactMatch;

  useEffect(() => {
    if (activeOption) {
      setInputValue(activeOption.label);
      return;
    }

    if (!isOpen) {
      setInputValue("");
    }
  }, [activeOption?.label, isOpen]);

  async function handleCreate() {
    if (!onCreate || !canCreate || isCreating) {
      return;
    }

    setIsCreating(true);

    try {
      const createdOption = await onCreate(inputValue.trim());
      onChange(createdOption.id);
      setInputValue(createdOption.label);
      setIsOpen(false);
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
      <label
        htmlFor={inputId}
        className="text-sm font-semibold text-stone-800 dark:text-stone-200"
      >
        {label}
        {required ? <span className="text-[#f44336]"> *</span> : null}
      </label>

      <div
        className="relative"
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
      >
        <input
          id={inputId}
          type="text"
          value={inputValue}
          disabled={disabled}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setInputValue(event.target.value);
            setIsOpen(true);

            if (value !== null) {
              onChange(null);
            }
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }

            event.preventDefault();

            if (canCreate) {
              void handleCreate();
            }
          }}
          placeholder={placeholder}
          className={[
            "h-11 w-full rounded-lg border bg-white pl-3 text-sm font-medium text-stone-950 shadow-sm outline-none transition-colors placeholder:text-stone-400 disabled:cursor-default disabled:opacity-60 dark:bg-[#111213] dark:text-white dark:placeholder:text-stone-500",
            canCreate ? "pr-22" : "pr-10",
            isOpen
              ? "border-[#f44336] dark:border-[#ff8a3d]"
              : "border-stone-200 hover:bg-stone-50 dark:border-[#2d2e30] dark:hover:bg-[#18191b]",
          ].join(" ")}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-required={required}
        />

        {canCreate ? (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleCreate}
            disabled={isCreating}
            className="absolute right-9 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#f44336] text-white transition-colors hover:bg-[#d7382d] disabled:cursor-default disabled:opacity-60 dark:bg-[#ff8a3d] dark:text-stone-950 dark:hover:bg-[#ff7920]"
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
          className="absolute bottom-0 right-0 top-0 flex w-9 cursor-pointer items-center justify-center disabled:cursor-default"
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
              {filteredOptions.map((option) => {
                const isActive = option.id === value;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onChange(option.id);
                      setIsOpen(false);
                      setInputValue(option.label);
                    }}
                    className={[
                      "grid w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
                      isActive
                        ? "bg-red-50 text-stone-950 dark:bg-[#24262a] dark:text-white"
                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-[#18191b] dark:hover:text-white",
                    ].join(" ")}
                    role="option"
                    aria-selected={isActive}
                  >
                    <span className="truncate">{option.label}</span>
                    {option.description ? (
                      <span className="truncate text-xs font-normal text-stone-400 dark:text-stone-500">
                        {option.description}
                      </span>
                    ) : null}
                  </button>
                );
              })}

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
