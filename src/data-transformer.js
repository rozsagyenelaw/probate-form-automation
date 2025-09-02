function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
}

function formatCurrency(value) {
  if (!value) return "$0.00";
  const num = parseFloat(value.toString().replace(/[^0-9.-]/g, ''));
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parseHeirs(heirsList) {
  if (typeof heirsList === 'string') {
    return heirsList.split('\n').map(line => {
      const parts = line.split(',');
      return {
        name: parts[0]?.trim(),
        relationship: parts[1]?.trim(),
        age: parts[2]?.trim(),
        address: parts[3]?.trim(),
      };
    });
  }
  return heirsList || [];
}

function transformQuestionnaireData(webhookData) {
  const transformed = {
    attorney: {
      name: webhookData.attorney_name || "ROZSA GYENE, ESQ.",
      bar_number: webhookData.attorney_bar || "208356",
      firm_name: webhookData.firm_name || "LAW OFFICES OF ROZSA GYENE",
      street: webhookData.firm_street || "450 N BRAND BLVD SUITE 600",
      city: webhookData.firm_city || "GLENDALE",
      state: webhookData.firm_state || "CA",
      zip: webhookData.firm_zip || "91203",
      phone: webhookData.firm_phone || "818-291-6217",
      fax: webhookData.firm_fax || "818-291-6205",
      email: webhookData.firm_email || "ROZSAGYENELAW@YAHOO.COM",
    },
    
    decedent: {
      name: webhookData.decedent_name,
      death_date: formatDate(webhookData.death_date),
      death_place: webhookData.death_place,
      death_address: webhookData.death_address,
      is_resident: webhookData.death_resident === "yes",
    },
    
    petitioner: {
      name: webhookData.petitioner_name,
      relationship: webhookData.petitioner_relationship,
      address: webhookData.petitioner_address,
      phone: webhookData.petitioner_phone,
      is_executor: webhookData.petitioner_is_executor === "yes",
    },
    
    estate: {
      personal_property: formatCurrency(webhookData.personal_property_value),
      real_property_gross: formatCurrency(webhookData.real_property_gross),
      real_property_encumbrance: formatCurrency(webhookData.real_property_encumbrance),
      has_will: webhookData.has_will === "yes",
      will_date: formatDate(webhookData.will_date),
      will_self_proving: webhookData.will_self_proving === "yes",
    },
    
    heirs: parseHeirs(webhookData.heirs_list),
    
    administration: {
      type: webhookData.admin_type,
      bond_required: webhookData.bond_required === "yes",
      bond_amount: formatCurrency(webhookData.bond_amount),
    },
    
    court: {
      county: webhookData.court_county || "LOS ANGELES",
      branch: webhookData.court_branch || "CENTRAL",
      street: "111 N HILL ST",
      city: "LOS ANGELES",
      zip: "90012",
    }
  };
  
  return transformed;
}

module.exports = {
  transformQuestionnaireData,
  formatDate,
  formatCurrency,
  parseHeirs
};
