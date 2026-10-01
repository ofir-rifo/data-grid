import { render } from '@testing-library/react';

import App from './app';

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<App />);
    expect(baseElement).toBeTruthy();
  });

  it('renders the virtualized grid and its shared scrollport', () => {
    const { getByTestId, getByText } = render(<App />);

    expect(getByTestId('grid-scrollport')).toBeTruthy();
    expect(getByText('Grid')).toBeTruthy();
  });
});
