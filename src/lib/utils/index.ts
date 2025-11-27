export { cn } from './cn';

// Hazard mapping utilities
export * from './hazard-mapping';

// Type utility to add a ref property to component props
export type WithElementRef<T> = T & {
	ref?: any;
};

// Type utility to omit children and child properties from component props
export type WithoutChildrenOrChild<T> = Omit<T, 'children' | 'child'>;
