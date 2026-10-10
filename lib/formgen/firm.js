// The attorney block printed on every form. Exactly as Rozsa set it (build order item 59).
// No fax line anywhere: the fax field is always left blank.
module.exports = {
  attorneyName: 'Rozsa Gyene, Esq.',
  attorneyNameCaps: 'ROZSA GYENE, ESQ.',
  barNumber: '208356',
  firmName: 'Law Offices of Rozsa Gyene',
  firmNameCaps: 'LAW OFFICES OF ROZSA GYENE',
  street: '3500 W. Olive Ave., Suite 300',
  city: 'Burbank',
  state: 'CA',
  zip: '91505',
  phone: '818-337-4071',
  fax: '',
  email: 'rozsa@myprobateca.com',
  cityStateZip() { return `${this.city}, ${this.state} ${this.zip}`; },
};
