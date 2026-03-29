from odoo import fields, models


class BakkiSpecies(models.Model):
    _name = 'bakki.species'
    _description = 'Bakki species'
    _order = 'common_name'
    _rec_name = 'common_name'

    common_name = fields.Char(string='Common Name', required=True, index=True)
    botanical_name = fields.Char(string='Botanical Name', required=True, index=True)
    code = fields.Char(string='Species Code', index=True)
    inventory_unit = fields.Char(string='Inventory Unit', default='trees', required=True)
    quantity_on_hand = fields.Float(string='Quantity on Hand', default=0.0)
    total_planted = fields.Float(string='Total Planted', default=0.0)
    growth_phase_label = fields.Char(string='Growth Phase')
    area_type_label = fields.Char(string='Area Type')
    active = fields.Boolean(string='Active', default=True)
    notes = fields.Text(string='Notes')
