import { fireEvent, render } from '@testing-library/react-native';
import { Checkbox } from '../ui/checkbox';
import { Chip } from '../ui/chip';
import { SegmentedControl } from '../ui/segmented-control';
import { Stepper } from '../ui/stepper';

describe('Stepper', () => {
  it('incrémente, décrémente et respecte les bornes', async () => {
    const onChange = jest.fn();
    const r = await render(<Stepper value={2} min={1} max={3} onChange={onChange} label="2 personnes" unit="pers." />);
    expect(r.getByText('2 pers.')).toBeTruthy();
    await fireEvent.press(r.getByLabelText('Augmenter'));
    expect(onChange).toHaveBeenLastCalledWith(3);
    await fireEvent.press(r.getByLabelText('Diminuer'));
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('désactive le bouton à la borne', async () => {
    const onChange = jest.fn();
    const r = await render(<Stepper value={1} min={1} max={8} onChange={onChange} label="1 personne" />);
    await fireEvent.press(r.getByLabelText('Diminuer'));
    expect(onChange).not.toHaveBeenCalled();
    expect(r.getByLabelText('Diminuer').props.accessibilityState).toEqual({ disabled: true });
  });
});

describe('Chip et Checkbox', () => {
  it('Chip sélectionnable expose son état et réagit au tap', async () => {
    const onPress = jest.fn();
    const r = await render(<Chip label="Gluten" variant="allergen" selected onPress={onPress} />);
    const chip = r.getByLabelText('Gluten');
    expect(chip.props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('Checkbox bascule', async () => {
    const onToggle = jest.fn();
    const r = await render(<Checkbox checked={false} onToggle={onToggle} accessibilityLabel="Tomates, 900 g, non coché" />);
    const box = r.getByRole('checkbox');
    expect(box.props.accessibilityState).toEqual({ checked: false });
    await fireEvent.press(box);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('SegmentedControl renvoie la valeur choisie', async () => {
    const onChange = jest.fn();
    const r = await render(
      <SegmentedControl
        options={[
          { value: 15, label: '15 min' },
          { value: 30, label: '30 min' },
        ]}
        value={30}
        onChange={onChange}
      />,
    );
    await fireEvent.press(r.getByText('15 min'));
    expect(onChange).toHaveBeenCalledWith(15);
  });
});
