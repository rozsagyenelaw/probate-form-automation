// Maps a MyProbateCA case document to this form's field names (W1-security item 16).
// Same mapping the admin case screen used when it put the data in the web address; the case is now
// read here by caseId through the signed-in admin session, so no client data is in the URL.
window.caseToGeneratorData = function (caseData) {
    // Map questionnaire data to generator format
    const decedent = caseData.decedent || {};
    const petitioner = caseData.petitioner || {};
    const heirs = caseData.heirs || [];
    const assets = caseData.assets || {};
    const liabilities = caseData.liabilities || [];

    // Calculate asset totals
    const personalPropertyValue =
      (assets.bankAccounts || []).reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0) +
      (assets.investments || []).reduce((sum, i) => sum + (parseFloat(i.value) || 0), 0) +
      (assets.vehicles || []).reduce((sum, v) => sum + (parseFloat(v.value) || 0), 0) +
      (assets.personalProperty || []).reduce((sum, p) => sum + (parseFloat(p.value) || 0), 0);

    const realPropertyGross = (assets.realProperty || []).reduce((sum, p) => sum + (parseFloat(p.estimatedValue) || 0), 0);
    const realPropertyEncumbrance = (assets.realProperty || []).reduce((sum, p) => sum + (parseFloat(p.mortgageBalance) || 0), 0);

    // Format heirs list (name, relationship, age, address)
    const heirsList = heirs.map(h => {
      const name = `${h.firstName || ''} ${h.lastName || ''}`.trim();
      const relationship = h.relationship || '';
      const age = h.isMinor ? 'Minor' : (h.age || 'Adult');
      const address = h.address ?
        `${h.address.street || ''}, ${h.address.city || ''}, ${h.address.state || 'CA'} ${h.address.zip || ''}`.trim() : '';
      return `${name}, ${relationship}, ${age}, ${address}`;
    }).join('\n');

    // Format addresses
    const decedentAddress = decedent.lastAddress ?
      `${decedent.lastAddress.street || ''}, ${decedent.lastAddress.city || ''}, ${decedent.lastAddress.state || 'CA'} ${decedent.lastAddress.zip || ''}`.trim() : '';

    const petitionerAddress = petitioner.address ?
      `${petitioner.address.street || ''}, ${petitioner.address.city || ''}, ${petitioner.address.state || 'CA'} ${petitioner.address.zip || ''}`.trim() : '';

    // Build data object for generator
    const generatorData = {
      // Decedent
      decedent_name: `${decedent.firstName || ''} ${decedent.middleName || ''} ${decedent.lastName || ''}`.replace(/\s+/g, ' ').trim(),
      death_date: decedent.dateOfDeath || '',
      death_place: decedent.placeOfDeath || '',
      death_address: decedentAddress,
      death_resident: (decedent.lastAddress?.state === 'CA' || decedent.lastAddress?.state === 'California') ? 'yes' : 'yes', // Default to CA resident

      // Petitioner
      petitioner_name: `${petitioner.firstName || ''} ${petitioner.lastName || ''}`.trim(),
      petitioner_relationship: petitioner.relationship || '',
      petitioner_address: petitionerAddress,
      petitioner_phone: petitioner.phone || '',
      petitioner_is_executor: caseData.namedExecutor?.toLowerCase().includes(petitioner.firstName?.toLowerCase() || '') ? 'yes' : 'no',

      // Estate values
      personal_property_value: Math.round(personalPropertyValue) || 0,
      real_property_gross: Math.round(realPropertyGross) || 0,
      real_property_encumbrance: Math.round(realPropertyEncumbrance) || 0,

      // Will info
      has_will: caseData.willExists ? 'yes' : 'no',
      will_date: caseData.willDate || '',
      will_self_proving: 'no',

      // Family survivor info
      has_spouse: caseData.survivedBySpouse ? 'yes' : 'no',
      has_children: caseData.survivedByChildren ? 'yes' : 'no',
      has_grandchildren: caseData.survivedByGrandchildren ? 'yes' : 'no',

      // Heirs
      heirs_list: heirsList,

      // Administration
      admin_type: 'full',
      bond_required: caseData.bondWaivedInWill ? 'no' : 'yes',
      bond_amount: 0,

      // Court
      court_county: (caseData.filingCounty || decedent.lastAddress?.county || 'LOS ANGELES').toUpperCase(),
      court_branch: ''
    };

    return generatorData;
};
