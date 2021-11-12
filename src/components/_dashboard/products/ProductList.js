import PropTypes from 'prop-types';
// material
import { Grid } from '@mui/material';
import ShopProductCard from './ProductCard';
import {
  useModalContext
} from '../../../contexts/ProductModalContext';
// ----------------------------------------------------------------------

ProductList.propTypes = {
  products: PropTypes.array.isRequired
};

export default function ProductList({ ...other }) {
  
  const { contents } = useModalContext();
  return (
    <Grid container spacing={3} {...other}>
      {contents.map((product, i) => (
        <Grid key={/*product.id*/ i} item xs={12} sm={6} md={3}>
          <ShopProductCard product={product} />
        </Grid>
      ))}
    </Grid>
  );
}
