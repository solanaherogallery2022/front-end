import PropTypes from 'prop-types';
import { Link as RouterLink } from 'react-router-dom';
import bs58 from 'bs58';
// material
import { Box, Card, Link, Typography, Stack, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
// utils
import { fCurrency } from '../../../utils/formatNumber';
import { Icon, InlineIcon } from '@iconify/react';
//
import Label from '../../Label';
import ColorPreview from '../../ColorPreview';


// ----------------------------------------------------------------------

const ProductImgStyle = styled('img')({
  top: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  position: 'absolute'
});

// ----------------------------------------------------------------------

ShopProductCard.propTypes = {
  product: PropTypes.object
};

const onBuyClick = () => {
  console.log("onBuyClick");
}
export default function ShopProductCard({ product }) {
  const { data, updateAuthority, mint } = product;
  const { name, symbol, image_uri, creators, sellerFeeBasisPoints } = data;

  return (
    <Card>
      <Box sx={{ pt: '100%', position: 'relative' }}>
        <Label
          variant="filled"
          color={'info'}
          sx={{
            zIndex: 9,
            top: 16,
            right: 16,
            position: 'absolute',
            textTransform: 'uppercase'
          }}
        >
          {"new"}
        </Label>
        <a href={image_uri}>
          <ProductImgStyle alt={name} src={image_uri} />
        </a>
      </Box>

      <Stack spacing={1} sx={{ p: 3 }}>
        
        <a href={"https://solscan.io/account/" + bs58.encode( mint ) + "?cluster=devnet"} target="_blank">
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2" noWrap>
            {name}
            </Typography>
            <Typography variant="subtitle2">
              <InlineIcon icon="bi:arrow-right"/>
            </Typography>
          </Stack>
        </a>

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Button
            variant="contained"
          >
              Buy
          </Button>
          <Typography variant="subtitle1">
            <Typography
              component="span"
              variant="body1"
              sx={{
                color: 'text.disabled',
                textDecoration: 'line-through'
              }}
            >
              {"0.8 SOL"}
            </Typography>
            &nbsp;
            {"0.6 SOL"}
          </Typography>
        </Stack>
        <Typography variant="subtitle2" noWrap>
            <InlineIcon icon={"clarity:align-left-text-line"}/> Authority
        </Typography>
        <a href={"https://solscan.io/account/" + bs58.encode( updateAuthority ) + "?cluster=devnet"} target="_blank">
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2" noWrap>
            Update: { bs58.encode( updateAuthority ) }
            </Typography>
            <Typography variant="subtitle2">
              <InlineIcon icon="bi:arrow-right"/>
            </Typography>
          </Stack>
        </a>
      </Stack>
    </Card>
  );
}
