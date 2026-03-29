from odoo import fields, models


class BakkiArea(models.Model):
    _name = 'bakki.area'
    _description = 'Bakki area'
    _order = 'name'

    zone_id = fields.Many2one('bakki.zone', string='Zone', required=True, ondelete='cascade', index=True)
    primary_species_id = fields.Many2one('bakki.species', string='Primary Species', ondelete='set null', index=True)
    name = fields.Char(string='Area Name', required=True, index=True)
    code = fields.Char(string='Area Code', index=True)
    geometry_wkt = fields.Text(
        string='Geometry WKT',
        help='Legacy geometry scaffold retained while Bakki Core PostGIS owns authoritative geometry.',
    )
    area_hectares = fields.Float(string='Area (ha)')
    planting_status = fields.Selection(
        selection=[
            ('planned', 'Planned'),
            ('active', 'Active'),
            ('complete', 'Complete'),
            ('needs_review', 'Needs Review'),
        ],
        string='Planting Status',
        default='planned',
        required=True,
        index=True,
    )
    current_height_m = fields.Float(string='Current Height (m)')
    current_tree_count = fields.Integer(string='Current Tree Count')
    current_density_per_100sqm = fields.Float(string='Current Density per 100 sqm')
    survival_per_100sqm = fields.Float(string='Survival per 100 sqm')
    notes = fields.Text(string='Notes')
    active = fields.Boolean(string='Active', default=True)

    _sql_constraints = [
        ('bakki_area_zone_name_unique', 'unique(zone_id, name)', 'Area names must be unique within a zone.'),
    ]
