import type { EbayItem } from '@/types/ebay';
import type { EbayListing as SportsListing } from '@/types/sportsEbay';
import type { EbayListing as TcgListing } from '@/types/tcg';

export function sportsListingToEbayItem(listing: SportsListing): EbayItem {
  const buyingOption = listing.buyingOptions?.includes('AUCTION')
    ? 'AUCTION' as const
    : listing.buyingOptions?.includes('FIXED_PRICE')
      ? 'FIXED_PRICE' as const
      : 'UNKNOWN' as const;

  return {
    itemId: listing.itemId,
    title: listing.title,
    price: {
      value: listing.price != null ? String(listing.price) : '0.00',
      currency: listing.currency ?? 'USD',
    },
    shipping: listing.shippingCost != null
      ? { value: String(listing.shippingCost), currency: listing.currency ?? 'USD' }
      : undefined,
    condition: listing.condition ?? 'Not Specified',
    buyingOption,
    endDate: listing.itemEndDate ?? undefined,
    imageUrl: listing.imageUrl ?? undefined,
    itemUrl: listing.itemWebUrl,
    seller: listing.seller ?? undefined,
  };
}

export function tcgListingToEbayItem(listing: TcgListing): EbayItem {
  return {
    itemId: listing.itemId,
    title: listing.title,
    price: {
      value: listing.price.value,
      currency: listing.price.currency,
    },
    shipping: listing.shipping
      ? { value: listing.shipping.cost, currency: listing.price.currency }
      : undefined,
    condition: listing.condition ?? 'Not Specified',
    buyingOption: listing.listingType === 'AUCTION' ? 'AUCTION' : 'FIXED_PRICE',
    imageUrl: listing.image,
    itemUrl: listing.itemWebUrl,
  };
}
