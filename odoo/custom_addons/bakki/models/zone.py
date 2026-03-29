from odoo import fields, models


class BakkiZone(models.Model):
    _name = 'bakki.zone'
    _description = 'Bakki zone'
    _order = 'name'

    ranch_id = fields.Many2one('bakki.ranch', string='Ranch', required=True, ondelete='cascade', index=True)
    name = fields.Char(string='Zone Name', required=True, index=True)
    code = fields.Char(string='Zone Code', index=True)
    geometry_wkt = fields.Text(
        string='Geometry WKT',
        help='Legacy geometry scaffold retained while Bakki Core PostGIS owns authoritative geometry.',
    )
    area_hectares = fields.Float(string='Area (ha)')
    active = fields.Boolean(string='Active', default=True)

    _sql_constraints = [
        ('bakki_zone_ranch_name_unique', 'unique(ranch_id, name)', 'Zone names must be unique within a ranch.'),
    ]
