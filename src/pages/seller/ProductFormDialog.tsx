import React, { useEffect, useMemo, useState } from 'react';
import type { ProductCategory, SellerProfile, StoreProduct } from '../../types';
import { Button, Dialog, Field, Notice } from '../../components/ui';
import { availabilityForStock, PRODUCT_CATEGORIES } from '../../services/sellerService';

const SEASON_TAGS: StoreProduct['seasonTag'][] = ['All Season', 'Kharif', 'Rabi', 'Zaid'];

const IMAGE_TYPE_BY_CATEGORY: Record<ProductCategory, string> = {
  'Seeds and planting material': 'seeds-wheat',
  'Fertilizers and soil nutrients': 'fertilizer-npk',
  'Crop protection products': 'protection-spray',
  'Organic farming inputs': 'organic-compost',
  'Soil testing and farm-monitoring kits': 'kit-soil',
  'Irrigation equipment': 'irrigation-drip',
  'Sprayers and farm tools': 'tool-sprayer',
  'Hand tools and accessories': 'tool-hand',
  'Farm safety equipment': 'safety-kit',
  'Harvesting and storage supplies': 'storage-bag',
};

export interface ProductFormValues {
  name: string;
  category: ProductCategory;
  brand: string;
  packSize: string;
  stockCount: string;
  priceRs: string;
  mrpRs: string;
  seasonTag: StoreProduct['seasonTag'];
  compatibleCrops: string;
  shortDescription: string;
  usageInstructions: string;
  storageInstructions: string;
  shippingEstimateDays: string;
}

type FieldErrors = Partial<Record<keyof ProductFormValues, string>>;

function blankValues(profile: SellerProfile): ProductFormValues {
  return {
    name: '',
    category: 'Seeds and planting material',
    brand: profile.tradeName || profile.businessName.replace(/\s*\(demo seller\)/i, ''),
    packSize: '',
    stockCount: '',
    priceRs: '',
    mrpRs: '',
    seasonTag: 'All Season',
    compatibleCrops: '',
    shortDescription: '',
    usageInstructions: '',
    storageInstructions: '',
    shippingEstimateDays: '',
  };
}

function valuesFromProduct(product: StoreProduct): ProductFormValues {
  return {
    name: product.name,
    category: product.category,
    brand: product.brand,
    packSize: product.packSize,
    stockCount: String(product.stockCount),
    priceRs: String(product.pricePaise / 100),
    mrpRs: String(product.mrpPaise / 100),
    seasonTag: product.seasonTag,
    compatibleCrops: product.compatibleCrops.join(', '),
    shortDescription: product.shortDescription,
    usageInstructions: product.usageInstructions,
    storageInstructions: product.storageInstructions,
    shippingEstimateDays: product.shippingEstimateDays,
  };
}

function parseMoney(value: string): number | null {
  const n = Number(value.replace(/[,₹\s]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function validateProductForm(values: ProductFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.name.trim()) errors.name = 'Enter the product name as it should appear in the store.';
  else if (values.name.trim().length < 3) errors.name = 'Name must be at least 3 characters.';
  if (!values.brand.trim()) errors.brand = 'Enter the brand or manufacturer.';
  if (!values.packSize.trim()) errors.packSize = 'Enter the pack size, e.g. 40 kg bag or 1 L bottle.';
  const stock = Number(values.stockCount);
  if (values.stockCount.trim() === '' || !Number.isInteger(stock) || stock < 0) errors.stockCount = 'Enter the number of units in stock (0 or more).';
  const price = parseMoney(values.priceRs);
  if (price === null || price <= 0) errors.priceRs = 'Enter a selling price greater than 0.';
  const mrp = values.mrpRs.trim() === '' ? price : parseMoney(values.mrpRs);
  if (mrp === null) errors.mrpRs = 'MRP must be a number.';
  else if (price !== null && mrp < price) errors.mrpRs = 'MRP cannot be lower than the selling price.';
  if (values.shortDescription.length > 400) errors.shortDescription = 'Keep the short description under 400 characters.';
  return errors;
}

interface ProductFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  product?: StoreProduct | null;
  profile: SellerProfile;
  isDemo: boolean;
  /** Focus the stock field on open (used by "Restock"). */
  focusStock?: boolean;
  onClose: () => void;
  onCreate: (product: Omit<StoreProduct, 'id'>) => void;
  onUpdate: (product: StoreProduct) => void;
}

export const ProductFormDialog: React.FC<ProductFormDialogProps> = ({ open, mode, product, profile, isDemo, focusStock, onClose, onCreate, onUpdate }) => {
  const [values, setValues] = useState<ProductFormValues>(() => (product ? valuesFromProduct(product) : blankValues(profile)));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(product ? valuesFromProduct(product) : blankValues(profile));
    setErrors({});
    setTouched(false);
    // The Dialog (a child) has already placed focus on its first control by the time this effect runs.
    if (focusStock) document.getElementById('product-stock')?.focus();
  }, [open, product, profile, focusStock]);

  const liveErrors = useMemo(() => validateProductForm(values), [values]);
  const shownErrors = touched ? liveErrors : errors;

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => setValues((current) => ({ ...current, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateProductForm(values);
    setErrors(nextErrors);
    setTouched(true);
    if (Object.keys(nextErrors).length > 0) return;

    const stockCount = Number(values.stockCount);
    const price = parseMoney(values.priceRs) || 0;
    const mrp = values.mrpRs.trim() === '' ? price : parseMoney(values.mrpRs) || price;
    const crops = values.compatibleCrops.split(',').map((crop) => crop.trim()).filter(Boolean);
    const sellerName = isDemo && !/\(demo seller\)/i.test(profile.businessName) ? `${profile.businessName} (Demo Seller)` : profile.businessName;

    const base = {
      name: values.name.trim(),
      category: values.category,
      brand: values.brand.trim(),
      packSize: values.packSize.trim(),
      pricePaise: Math.round(price * 100),
      mrpPaise: Math.round(mrp * 100),
      stockCount,
      availability: availabilityForStock(stockCount),
      seasonTag: values.seasonTag,
      compatibleCrops: crops.length > 0 ? crops : ['General use'],
      shortDescription: values.shortDescription.trim() || `${values.name.trim()} from ${profile.businessName}. Product claims and certifications have not been verified by AGRIPULSE.`,
      usageInstructions: values.usageInstructions.trim() || 'Follow the manufacturer label and your local package of practices.',
      storageInstructions: values.storageInstructions.trim() || 'Store in a dry, ventilated place away from children, food and animal feed.',
      shippingEstimateDays: values.shippingEstimateDays.trim() || (isDemo ? 'Estimated 2–4 days (demo delivery)' : 'Shipping provider not connected'),
    };

    if (mode === 'edit' && product) {
      onUpdate({ ...product, ...base, detailedDescription: product.detailedDescription || base.shortDescription });
    } else {
      onCreate({
        ...base,
        isSampleBrand: isDemo,
        sellerName,
        isDemoSeller: isDemo,
        detailedDescription: base.shortDescription,
        imageSvgType: IMAGE_TYPE_BY_CATEGORY[values.category],
        isFeatured: false,
        isPopular: false,
        isNewArrival: true,
        rating: 0,
        reviewCount: 0,
        safetyOrLegalNote: isDemo ? 'Sample listing created in the development demo workspace. Not a real offer for sale.' : 'Seller-provided listing. Product claims and certifications have not been verified by AGRIPULSE.',
      });
    }
    onClose();
  };

  const inputClass = 'ap-input';
  const errorCount = Object.keys(shownErrors).length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      wide
      title={mode === 'edit' ? `Edit listing` : 'Add listing'}
      description={mode === 'edit' ? product?.name : 'Create a new product listing in the AGRIPULSE Store. Fields marked * are required.'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="product-form">
            {mode === 'edit' ? 'Save changes' : 'Publish listing'}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} noValidate className="space-y-4">
        {touched && errorCount > 0 && (
          <Notice tone="danger" role="alert" title={`${errorCount} field${errorCount === 1 ? ' needs' : 's need'} attention`}>
            Fix the highlighted fields and try again.
          </Notice>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Product name" required error={shownErrors.name} className="sm:col-span-2">
            {({ id, describedBy, invalid }) => (
              <input id={id} className={inputClass} value={values.name} onChange={(event) => set('name', event.target.value)} aria-describedby={describedBy} aria-invalid={invalid} placeholder="e.g. HD-3086 certified wheat seed" autoComplete="off" />
            )}
          </Field>
          <Field label="Category" required>
            {({ id }) => (
              <select id={id} className="ap-select" value={values.category} onChange={(event) => set('category', event.target.value as ProductCategory)}>
                {PRODUCT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Brand / manufacturer" required error={shownErrors.brand}>
            {({ id, describedBy, invalid }) => <input id={id} className={inputClass} value={values.brand} onChange={(event) => set('brand', event.target.value)} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Field label="Pack size" required error={shownErrors.packSize} hint="Shown next to the price, e.g. 40 kg bag, 500 ml bottle.">
            {({ id, describedBy, invalid }) => <input id={id} className={inputClass} value={values.packSize} onChange={(event) => set('packSize', event.target.value)} aria-describedby={describedBy} aria-invalid={invalid} placeholder="40 kg bag" />}
          </Field>
          <Field label="Units in stock" required error={shownErrors.stockCount} htmlFor="product-stock" hint="0 marks the listing out of stock; 5 or fewer shows as low stock.">
            {({ id, describedBy, invalid }) => <input id={id} type="number" min={0} step={1} inputMode="numeric" className={inputClass} value={values.stockCount} onChange={(event) => set('stockCount', event.target.value)} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Field label="Selling price (₹ per pack)" required error={shownErrors.priceRs}>
            {({ id, describedBy, invalid }) => <input id={id} type="number" min={0} step="0.01" inputMode="decimal" className={inputClass} value={values.priceRs} onChange={(event) => set('priceRs', event.target.value)} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Field label="MRP (₹ per pack)" error={shownErrors.mrpRs} hint="Leave blank to use the selling price.">
            {({ id, describedBy, invalid }) => <input id={id} type="number" min={0} step="0.01" inputMode="decimal" className={inputClass} value={values.mrpRs} onChange={(event) => set('mrpRs', event.target.value)} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Field label="Season">
            {({ id }) => (
              <select id={id} className="ap-select" value={values.seasonTag} onChange={(event) => set('seasonTag', event.target.value as StoreProduct['seasonTag'])}>
                {SEASON_TAGS.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Suitable crops" hint="Comma-separated, e.g. Wheat, Mustard, Vegetables.">
            {({ id, describedBy }) => <input id={id} className={inputClass} value={values.compatibleCrops} onChange={(event) => set('compatibleCrops', event.target.value)} aria-describedby={describedBy} placeholder="Wheat, Mustard" />}
          </Field>
          <Field label="Short description" error={shownErrors.shortDescription} className="sm:col-span-2" hint="One or two plain sentences. Do not claim certifications you cannot document.">
            {({ id, describedBy, invalid }) => <textarea id={id} className="ap-textarea" rows={3} value={values.shortDescription} onChange={(event) => set('shortDescription', event.target.value)} aria-describedby={describedBy} aria-invalid={invalid} />}
          </Field>
          <Field label="Usage instructions" className="sm:col-span-2">
            {({ id }) => <textarea id={id} className="ap-textarea" rows={2} value={values.usageInstructions} onChange={(event) => set('usageInstructions', event.target.value)} placeholder="e.g. Sowing rate 40 kg per acre with a seed drill at 4–5 cm depth." />}
          </Field>
          <Field label="Storage instructions">
            {({ id }) => <input id={id} className={inputClass} value={values.storageInstructions} onChange={(event) => set('storageInstructions', event.target.value)} />}
          </Field>
          <Field label="Delivery estimate shown to buyers" hint="Shipping is not connected — describe what you can actually arrange.">
            {({ id, describedBy }) => <input id={id} className={inputClass} value={values.shippingEstimateDays} onChange={(event) => set('shippingEstimateDays', event.target.value)} aria-describedby={describedBy} placeholder="Dispatch within 2 working days" />}
          </Field>
        </div>
      </form>
    </Dialog>
  );
};
