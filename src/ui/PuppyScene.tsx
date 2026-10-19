import garden from '../assets/garden.svg';

export function PuppyScene({ className }: { className?: string }) {
  return <img className={className} src={garden} alt="" aria-hidden="true" />;
}
