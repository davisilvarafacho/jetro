import { createTheme, type MantineColorsTuple } from '@mantine/core';

const floresta: MantineColorsTuple = [
  '#EAF1EB',
  '#DFEDE4',
  '#C3DDCE',
  '#9FC4B0',
  '#6FA08B',
  '#3E7A66',
  '#21594A',
  '#194536',
  '#12362B',
  '#0C271F',
];

const coral: MantineColorsTuple = [
  '#FDEBE4',
  '#F8CDBE',
  '#F2AB94',
  '#EA866A',
  '#DF6647',
  '#D4552F',
  '#C9472A',
  '#A93B22',
  '#8A2C16',
  '#6B2210',
];

const red: MantineColorsTuple = [
  '#FDECEE',
  '#F9D0D4',
  '#F2A8AF',
  '#EA7F89',
  '#E05A66',
  '#D3414E',
  '#C42D3A',
  '#A82430',
  '#8E1F2B',
  '#6F1822',
];

export const theme = createTheme({
  colors: { floresta, coral, red },
  primaryColor: 'floresta',
  primaryShade: 6,
  black: '#1A2A24',
  fontFamily: 'var(--font-figtree), system-ui, sans-serif',
  headings: {
    fontFamily: 'var(--font-bricolage), var(--font-figtree), sans-serif',
    fontWeight: '600',
  },
  radius: { xs: '8px', sm: '12px', md: '16px', lg: '22px', xl: '999px' },
  defaultRadius: 'sm',
  components: {
    Button: { defaultProps: { radius: 'xl', size: 'md' } },
    TextInput: { defaultProps: { size: 'md' } },
    PasswordInput: { defaultProps: { size: 'md' } },
    Select: { defaultProps: { size: 'md' } },
    MultiSelect: { defaultProps: { size: 'md' } },
  },
});
